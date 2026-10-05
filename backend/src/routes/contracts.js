const { Router } = require('express');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { getMemberRole } = require('../services/workspace');
const contracts = require('../services/contracts');

const router = Router();
const writers = ['admin', 'producer', 'clearance_counsel'];

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

function signatureFrom(req) {
  const body = req.body || {};
  return {
    typedName: body.typed_name || body.typedName,
    signatureSvg: body.signature_svg || body.signatureSvg || '',
    ip: clientIp(req),
    userAgent: req.headers['user-agent'] || body.user_agent || '',
    actorId: getUserId(req),
  };
}

async function assertWriter(req, workspaceId) {
  const role = await getMemberRole(workspaceId, getUserId(req));
  if (!role) {
    const err = new Error('You are not a member of this workspace');
    err.status = 403;
    throw err;
  }
  if (!writers.includes(role)) {
    const err = new Error('Required role: admin or producer or clearance_counsel');
    err.status = 403;
    throw err;
  }
}

router.get('/v1/contracts/review/:token', async (req, res, next) => {
  try {
    res.json(await contracts.reviewByToken(req.params.token));
  } catch (err) { next(err); }
});

router.post('/v1/contracts/review/:token/sign', async (req, res, next) => {
  try {
    const signed = await contracts.signByToken(req.params.token, signatureFrom(req));
    res.json({ data: signed, message: 'Rider signed' });
  } catch (err) { next(err); }
});

router.post('/v1/contracts/draft', requireAuth, async (req, res, next) => {
  try {
    const workspaceId = req.body?.workspace_id;
    if (!workspaceId) return res.status(400).json({ message: 'workspace_id is required' });
    await assertWriter(req, workspaceId);
    const rider = await contracts.draftContract({ ...req.body, workspace_id: workspaceId }, getUserId(req));
    res.status(201).json({ data: rider, message: 'Digital replica rider drafted' });
  } catch (err) { next(err); }
});

router.get('/v1/workspaces/:workspaceId/contracts', requireAuth, async (req, res, next) => {
  try {
    const role = await getMemberRole(req.params.workspaceId, getUserId(req));
    if (!role) return res.status(403).json({ message: 'You are not a member of this workspace' });
    res.json(await contracts.listContracts(req.params.workspaceId, req.query.shoot_id));
  } catch (err) { next(err); }
});

router.post('/v1/contracts/:id/send-notice', requireAuth, async (req, res, next) => {
  try {
    const workspaceId = req.body?.workspace_id || req.query.workspace_id;
    if (!workspaceId) return res.status(400).json({ message: 'workspace_id is required' });
    await assertWriter(req, workspaceId);
    const rider = await contracts.sendNotice(req.params.id, workspaceId, getUserId(req));
    res.json({ data: rider, message: '48-hour advance notice recorded' });
  } catch (err) { next(err); }
});

router.post('/v1/contracts/:id/sign', requireAuth, async (req, res, next) => {
  try {
    const workspaceId = req.body?.workspace_id || req.query.workspace_id;
    if (!workspaceId) return res.status(400).json({ message: 'workspace_id is required' });
    await assertWriter(req, workspaceId);
    const rider = await contracts.signContract(req.params.id, workspaceId, signatureFrom(req));
    res.json({ data: rider, message: 'Rider signed' });
  } catch (err) { next(err); }
});

module.exports = router;
