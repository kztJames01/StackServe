const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const ALLOWED_FOLDERS = new Set(['avatars', 'projects']);
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

let client = null;

function getStorageConfig() {
  const bucket = process.env.B2_BUCKET;
  const endpoint = process.env.B2_ENDPOINT;
  const keyId = process.env.B2_KEY_ID;
  const appKey = process.env.B2_APPLICATION_KEY;
  const region = process.env.B2_REGION || 'us-east-005';

  if (!bucket || !endpoint || !keyId || !appKey) return null;
  return { bucket, endpoint, keyId, appKey, region };
}

function getStorageClient() {
  const cfg = getStorageConfig();
  if (!cfg) return null;
  if (client) return client;

  client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.keyId,
      secretAccessKey: cfg.appKey,
    },
  });
  return client;
}

function getFileExtension(filename) {
  const match = (filename || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : 'bin';
}

function buildPublicUrl(key) {
  const cfg = getStorageConfig();
  if (!cfg) return null;
  const explicit = process.env.B2_PUBLIC_BASE_URL;
  if (explicit) return `${explicit.replace(/\/$/, '')}/${key}`;
  return `${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${key}`;
}

async function createUploadUrl({ folder, userId, filename, contentType }) {
  const cfg = getStorageConfig();
  const s3 = getStorageClient();
  if (!cfg || !s3) {
    const err = new Error('Storage is not configured');
    err.status = 503;
    throw err;
  }
  if (!ALLOWED_FOLDERS.has(folder)) {
    const err = new Error('Invalid upload folder');
    err.status = 400;
    throw err;
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    const err = new Error('Unsupported file type');
    err.status = 400;
    throw err;
  }

  const ext = getFileExtension(filename);
  const key = `${folder}/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 300,
    signableHeaders: new Set(['content-type']),
  });

  return {
    key,
    uploadUrl,
    fileUrl: buildPublicUrl(key),
    method: 'PUT',
    headers: { 'Content-Type': contentType },
  };
}

module.exports = { createUploadUrl };
