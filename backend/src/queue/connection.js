// shared ioredis connection for BullMQ
// separate from the node-redis client used by rate limiters
const IORedis = require('ioredis');

let connection = null;

function getRedisConnection() {
  if (connection) return connection;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is required for the provenance queue');
  connection = new IORedis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,
  });
  connection.on('error', (err) => {
    // log but don't crash the process — BullMQ handles reconnect
    console.error('[redis] connection error', err.message);
  });
  return connection;
}

module.exports = { getRedisConnection };
