const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { createUploadUrl, verifyObjectSha256 } = require('../src/services/storage');

const enabled = process.env.LIVE_B2_500MB === '1';

test('live B2 accepts 500MB MP4 payload and returns matching SHA-256', { skip: !enabled }, async () => {
  const size = 500 * 1024 * 1024;
  const chunk = Buffer.alloc(1024 * 1024, 0x53);
  const hash = crypto.createHash('sha256');
  const signed = await createUploadUrl({
    folder: 'media',
    userId: 'live-acceptance',
    filename: 'synthpass-500mb-test.mp4',
    contentType: 'video/mp4',
    size,
    expiresIn: 7200,
  });

  async function* body() {
    for (let sent = 0; sent < size; sent += chunk.length) {
      hash.update(chunk);
      yield chunk;
    }
  }

  const response = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: Readable.toWeb(Readable.from(body())),
    duplex: 'half',
  });
  assert.ok(response.ok, `B2 upload returned ${response.status}`);

  const expected = hash.digest('hex');
  const verified = await verifyObjectSha256(signed.key, expected, size);
  assert.equal(verified.matches, true);
  assert.equal(verified.actualHash, expected);
  assert.equal(verified.size, size);
});
