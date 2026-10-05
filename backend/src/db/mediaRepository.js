const { query } = require('./pool');

async function createMediaAsset(asset) {
  const result = await query(
    `INSERT INTO media_assets
      (id, workspace_id, shoot_id, uploader_id, filename, mime_type, file_size_bytes,
       sha256_hash, b2_storage_key, b2_public_url, upload_state,
       ai_generated, ai_model_name, ai_model_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,$13)
     RETURNING *`,
    [
      asset.id, asset.workspaceId, asset.shootId || null, asset.uploaderId,
      asset.filename, asset.mimeType, asset.fileSizeBytes, asset.sha256Hash,
      asset.storageKey, null, Boolean(asset.aiModelName),
      asset.aiModelName || null, asset.aiModelVersion || null,
    ],
  );
  return result.rows[0];
}

async function findMediaAsset(id) {
  const result = await query('SELECT * FROM media_assets WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findPendingUpload(id, uploaderId) {
  const result = await query(
    `SELECT * FROM media_assets WHERE id = $1 AND uploader_id = $2 AND upload_state = 'pending'`,
    [id, uploaderId],
  );
  return result.rows[0] || null;
}

async function setUploadState(id, state) {
  const result = await query(
    'UPDATE media_assets SET upload_state = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, state],
  );
  return result.rows[0] || null;
}

async function listMediaAssets(workspaceId, shootId) {
  const params = [workspaceId];
  let sql = 'SELECT * FROM media_assets WHERE workspace_id = $1';
  if (shootId) {
    params.push(shootId);
    sql += ` AND shoot_id = $${params.length}`;
  }
  const result = await query(`${sql} ORDER BY created_at DESC`, params);
  return result.rows;
}

module.exports = {
  createMediaAsset,
  findMediaAsset,
  findPendingUpload,
  setUploadState,
  listMediaAssets,
};
