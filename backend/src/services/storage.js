const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const ALLOWED_FOLDERS = new Set(['avatars', 'projects', 'licenses', 'media', 'contracts', 'payroll']);
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain',
  // video types for media assets (Sprint 2)
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska',
  // audio types for Chromaprint fingerprinting (Sprint 4)
  'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg',
]);

// max size for non-media uploads (images, docs)
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

async function createUploadUrl({ folder, userId, filename, contentType, size, expiresIn = 300 }) {
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
    ...(size ? { ContentLength: Number(size) } : {}),
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn,
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

// server-side upload for generated artifacts (signed license PDFs)
async function uploadArtifact({ folder, key, body, contentType }) {
  const cfg = getStorageConfig();
  const s3 = getStorageClient();
  if (!cfg || !s3) return null;
  if (!ALLOWED_FOLDERS.has(folder)) {
    const err = new Error('Invalid upload folder');
    err.status = 400;
    throw err;
  }

  await s3.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  return { key, fileUrl: buildPublicUrl(key) };
}

async function hashBody(body) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of body) hash.update(chunk);
  return hash.digest('hex');
}

async function verifyObjectSha256(key, expectedHash, expectedSize) {
  const cfg = getStorageConfig();
  const s3 = getStorageClient();
  if (!cfg || !s3) {
    const err = new Error('Storage is not configured');
    err.status = 503;
    throw err;
  }
  const head = await s3.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
  if (Number(head.ContentLength) !== Number(expectedSize)) {
    return { matches: false, actualHash: null, size: Number(head.ContentLength) };
  }
  const object = await s3.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
  const actualHash = await hashBody(object.Body);
  return {
    matches: actualHash === String(expectedHash).toLowerCase(),
    actualHash,
    size: Number(head.ContentLength),
  };
}

// download a B2 object into a local temp file path
// caller is responsible for deleting the file when done
async function downloadToTempFile(key) {
  const cfg = getStorageConfig();
  const s3 = getStorageClient();
  if (!cfg || !s3) {
    const err = new Error('Storage is not configured');
    err.status = 503;
    throw err;
  }
  const os = require('os');
  const path = require('path');
  const ext = (key.match(/\.([a-z0-9]+)$/i) || ['', 'bin'])[1];
  const tmpPath = path.join(os.tmpdir(), `sp-dl-${crypto.randomUUID()}.${ext}`);
  const object = await s3.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
  const { pipeline } = require('stream/promises');
  const { createWriteStream } = require('fs');
  await pipeline(object.Body, createWriteStream(tmpPath));
  return tmpPath;
}

// upload a local file to B2 (worker variant — uses full key path directly, no folder restriction)
// for injected manifests and signed assets under 'media/' prefix
async function uploadWorkerArtifact({ key, filePath, contentType }) {
  const cfg = getStorageConfig();
  const s3 = getStorageClient();
  if (!cfg || !s3) return null;
  const { createReadStream } = require('fs');
  const { stat } = require('fs/promises');
  const { size } = await stat(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: createReadStream(filePath),
    ContentType: contentType,
    ContentLength: size,
  }));
  return { key, fileUrl: buildPublicUrl(key) };
}

module.exports = {
  createUploadUrl,
  uploadArtifact,
  verifyObjectSha256,
  hashBody,
  downloadToTempFile,
  uploadWorkerArtifact,
};
