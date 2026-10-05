const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('redis');

test('Redis integration can write, expire, and read a rate-limit key', async () => {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  await client.connect();
  const key = `synthpass:test:${process.pid}:${Date.now()}`;
  try {
    await client.set(key, '1', { EX: 30 });
    assert.equal(await client.get(key), '1');
    const ttl = await client.ttl(key);
    assert.ok(ttl > 0 && ttl <= 30);
  } finally {
    await client.del(key);
    await client.quit();
  }
});
