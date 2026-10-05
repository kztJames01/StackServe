const { Router } = require('express');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { tenantScope } = require('../middleware/tenantScope');
const media = require('../services/media');
const { getMemberRole } = require('../services/workspace');

const router = Router();
const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// request presigned upload URL + create asset row
// body: { workspace_id, shoot_id?, filename, mime_type, file_size_bytes, sha256_hash, ai_model_name? }
router.post('/v1/media/request-upload', requireAuth, route(async (req, res) => {
  const uploaderId = getUserId(req);
  const { workspace_id, shoot_id, filename, mime_type, file_size_bytes, sha256_hash, ai_model_name, ai_model_version } = req.body || {};

  if (!workspace_id) return res.status(400).json({ message: 'workspace_id is required' });
  if (!filename || !mime_type || !file_size_bytes || !sha256_hash) {
    return res.status(400).json({ message: 'filename, mime_type, file_size_bytes, sha256_hash are required' });
  }

  // verify workspace membership
  const role = await getMemberRole(workspace_id, uploaderId);
  if (!role) return res.status(403).json({ message: 'Not a workspace member' });
  if (!['admin', 'producer'].includes(role)) {
    return res.status(403).json({ message: 'Producer role required to upload media' });
  }

  const result = await media.requestUpload({
    workspaceId: workspace_id,
    shootId: shoot_id,
    uploaderId,
    filename,
    mimeType: mime_type,
    fileSizeBytes: Number(file_size_bytes),
    sha256Hash: sha256_hash,
    aiModelName: ai_model_name,
    aiModelVersion: ai_model_version,
  });

  res.status(201).json(result);
}));

// confirm upload complete
router.post('/v1/media/:id/complete', requireAuth, route(async (req, res) => {
  const uploaderId = getUserId(req);
  const pending = await require('../db/pool').query('SELECT workspace_id FROM media_assets WHERE id = $1', [req.params.id]);
  if (!pending.rows[0]) return res.status(404).json({ message: 'Asset not found' });
  if (!await getMemberRole(pending.rows[0].workspace_id, uploaderId)) {
    return res.status(403).json({ message: 'Not a workspace member' });
  }
  const asset = await media.completeUpload(req.params.id, uploaderId);
  res.json({ data: asset, message: 'Upload verified' });
}));

// get asset status
router.get('/v1/media/:id', requireAuth, route(async (req, res) => {
  const uploaderId = getUserId(req);
  // find the asset and verify caller is in the workspace
  const result = await require('../db/pool').query(
    'SELECT * FROM media_assets WHERE id = $1', [req.params.id]
  );
  const asset = result.rows[0];
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  const role = await getMemberRole(asset.workspace_id, uploaderId);
  if (!role) return res.status(403).json({ message: 'Not a workspace member' });
  res.json(asset);
}));

// list assets for workspace/shoot
router.get('/v1/workspaces/:id/media', requireAuth, tenantScope('id'), route(async (req, res) => {
  const { shoot_id } = req.query;
  const assets = await media.listAssets(req.params.id, shoot_id);
  res.json(assets);
}));

// trigger C2PA provenance injection for a verified asset
// body: { contract_id }
router.post('/v1/media/:id/bind-c2pa', requireAuth, route(async (req, res) => {
  const callerId = getUserId(req);
  const { contract_id } = req.body || {};
  if (!contract_id) return res.status(400).json({ message: 'contract_id is required' });

  // load asset
  const assetResult = await require('../db/pool').query(
    'SELECT * FROM media_assets WHERE id = $1', [req.params.id],
  );
  const asset = assetResult.rows[0];
  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  // verify role — admin, producer, or clearance_counsel
  const role = await getMemberRole(asset.workspace_id, callerId);
  if (!role) return res.status(403).json({ message: 'Not a workspace member' });
  if (!['admin', 'producer', 'clearance_counsel'].includes(role)) {
    return res.status(403).json({ message: 'Producer or clearance role required' });
  }

  // asset must be verified before we can process it
  if (asset.upload_state !== 'verified') {
    return res.status(409).json({ message: 'Asset upload must be verified before binding C2PA' });
  }

  // load and validate contract
  const contractResult = await require('../db/pool').query(
    'SELECT * FROM digital_replica_contracts WHERE id = $1', [contract_id],
  );
  const contract = contractResult.rows[0];
  if (!contract) return res.status(404).json({ message: 'Contract not found' });
  if (contract.workspace_id !== asset.workspace_id) {
    return res.status(403).json({ message: 'Contract is not in the same workspace as the asset' });
  }
  if (contract.shoot_id && asset.shoot_id && contract.shoot_id !== asset.shoot_id) {
    return res.status(409).json({ message: 'Contract and asset belong to different shoots' });
  }
  if (contract.status !== 'SIGNED') {
    return res.status(409).json({ message: 'Contract must be SIGNED before binding C2PA' });
  }
  const now = new Date();
  if (new Date(contract.starts_at) > now) {
    return res.status(409).json({ message: 'Contract has not started yet' });
  }
  if (new Date(contract.expires_at) < now) {
    return res.status(409).json({ message: 'Contract has expired' });
  }

  // create job row and enqueue
  const provenanceRepo = require('../db/provenanceRepository');
  const { enqueueProvenanceJob } = require('../queue/queues');

  // check if a job already exists (idempotent)
  const existing = await provenanceRepo.findJobByAssetContract(asset.id, contract.id);
  if (existing && existing.status === 'done') {
    return res.status(409).json({ message: 'C2PA provenance already bound for this asset and contract', job: existing });
  }

  const crypto = require('crypto');
  const jobId = existing?.id || crypto.randomUUID();
  let jobRow;
  if (!existing) {
    jobRow = await provenanceRepo.createProvenanceJob({
      id: jobId,
      assetId: asset.id,
      contractId: contract.id,
      workspaceId: asset.workspace_id,
    });
  } else {
    jobRow = existing;
  }

  let bullmqId;
  try {
    bullmqId = await enqueueProvenanceJob(jobRow);
    await provenanceRepo.setJobBullmqId(jobRow.id, bullmqId);
  } catch (err) {
    return res.status(503).json({ message: 'Queue unavailable — REDIS_URL may not be set', detail: err.message });
  }

  res.status(202).json({
    message: 'Provenance job queued',
    job_id: jobRow.id,
    bullmq_id: bullmqId,
    status: jobRow.status,
  });
}));

module.exports = router;
