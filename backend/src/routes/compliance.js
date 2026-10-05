const { Router } = require('express');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { getMemberRole } = require('../services/workspace');
const { query } = require('../db/pool');
const { evaluateCompliance, emitCompliance } = require('../services/compliance');
const { buildClearanceCertificate } = require('../services/clearanceCertificate');
const payroll = require('../services/payroll');

const router = Router();
const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

router.get('/compliance', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const workspaceId = String(req.query.workspaceId || '');
  if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
  if (!await getMemberRole(workspaceId, userId)) return res.status(403).json({ message: 'Not a workspace member' });

  const report = await evaluateCompliance(workspaceId, userId);
  emitCompliance(req.app, workspaceId, report);
  res.json(report);
}));

router.get('/v1/workspaces/:id/clearance-certificate', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  if (!await getMemberRole(req.params.id, userId)) return res.status(403).json({ message: 'Not a workspace member' });
  const report = await evaluateCompliance(req.params.id, userId);
  const ws = await query('SELECT name FROM agency_workspaces WHERE id = $1', [req.params.id]);
  const pdf = buildClearanceCertificate({ workspaceName: ws.rows[0]?.name, report });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="clearance-certificate.pdf"');
  res.send(pdf);
}));

router.post('/v1/payroll/export-batch', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const { workspace_id: workspaceId, shoot_id: shootId, format } = req.body || {};
  if (!workspaceId || !shootId || !format) {
    return res.status(400).json({ message: 'workspace_id, shoot_id, and format are required' });
  }
  const role = await getMemberRole(workspaceId, userId);
  if (!role) return res.status(403).json({ message: 'Not a workspace member' });
  if (!['admin', 'producer', 'clearance_counsel'].includes(role)) {
    return res.status(403).json({ message: 'Producer or clearance role required' });
  }

  const result = await payroll.exportBatch({
    workspaceId,
    shootId,
    format,
    createdBy: userId,
  });
  res.json({
    data: result.batch,
    filename: result.filename,
    contentType: result.contentType,
    body: result.body,
    message: 'Payroll batch exported',
  });
}));

module.exports = router;
