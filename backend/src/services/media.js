const crypto = require('crypto');
const { query } = require('../db/pool');
const mediaRepository = require('../db/mediaRepository');
let storage = require('./storage');

const ALLOWED_MIME = new Set([
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
]);

// create asset row + presigned B2 URL
async function requestUpload({ workspaceId, shootId, uploaderId, filename, mimeType, fileSizeBytes, sha256Hash, aiModelName, aiModelVersion }) {
  if (!ALLOWED_MIME.has(mimeType)) {
    const err = new Error('Unsupported file type');
    err.status = 400;
    throw err;
  }
  if (!sha256Hash || !/^[a-f0-9]{64}$/i.test(sha256Hash)) {
    const err = new Error('sha256_hash must be a 64-char hex string');
    err.status = 400;
    throw err;
  }
  if (!Number.isSafeInteger(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > 5 * 1024 * 1024 * 1024) {
    const err = new Error('file_size_bytes must be between 1 byte and 5GB');
    err.status = 400;
    throw err;
  }
  if (shootId) {
    const shoot = await query('SELECT id FROM projects WHERE id = $1 AND workspace_id = $2', [String(shootId), workspaceId]);
    if (!shoot.rows[0]) {
      const err = new Error('Shoot not found in this workspace');
      err.status = 404;
      throw err;
    }
  }

  const id = `asset-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  // get presigned URL - long expiry for large video uploads
  const signed = await storage.createUploadUrl({
    folder: 'media',
    userId: workspaceId,
    filename,
    contentType: mimeType,
    size: fileSizeBytes,
    expiresIn: 3600, // 1 hour for large files
  });

  await mediaRepository.createMediaAsset({
    id, workspaceId, shootId, uploaderId, filename, mimeType, fileSizeBytes,
    sha256Hash: sha256Hash.toLowerCase(), storageKey: signed.key,
    aiModelName, aiModelVersion,
  });

  return {
    asset_id: id,
    upload_url: signed.uploadUrl,
    key: signed.key,
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
  };
}

// mark upload complete + verify hash matches what was declared
async function completeUpload(assetId, uploaderId) {
  const asset = await mediaRepository.findPendingUpload(assetId, uploaderId);
  if (!asset) {
    const err = new Error('Asset not found or already completed');
    err.status = 404;
    throw err;
  }
  const verified = await storage.verifyObjectSha256(
    asset.b2_storage_key,
    asset.sha256_hash,
    asset.file_size_bytes,
  );
  const state = verified.matches ? 'verified' : 'failed';
  const result = await mediaRepository.setUploadState(assetId, state);
  if (!verified.matches) {
    const err = new Error('Stored object does not match the declared SHA-256 hash or file size');
    err.status = 422;
    err.asset = result;
    throw err;
  }
  return result;
}

async function getAsset(assetId, workspaceId) {
  const asset = await mediaRepository.findMediaAsset(assetId);
  return asset?.workspace_id === workspaceId ? asset : null;
}

async function listAssets(workspaceId, shootId) {
  return mediaRepository.listMediaAssets(workspaceId, shootId);
}

function setStorageForTests(overrides) {
  storage = { ...storage, ...overrides };
}

module.exports = { requestUpload, completeUpload, getAsset, listAssets, setStorageForTests };
