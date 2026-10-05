// standalone worker process for C2PA provenance jobs
// run: node backend/src/workers/provenanceWorker.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

// bootstrap DB migrations before processing jobs
const { bootstrapDatabase } = require('../db/bootstrap');
const { Worker } = require('bullmq');
const { getRedisConnection } = require('../queue/connection');
const { QUEUE_NAME } = require('../queue/queues');
const { processProvenanceJob } = require('./provenanceProcessor');

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || '2');
const JOB_TIMEOUT_MS = Number(process.env.WORKER_JOB_TIMEOUT_MS || '300000'); // 5 min

async function startWorker() {
  await bootstrapDatabase();
  console.log(`[worker] starting on queue "${QUEUE_NAME}" concurrency=${CONCURRENCY}`);

  const worker = new Worker(
    QUEUE_NAME,
    processProvenanceJob,
    {
      connection: getRedisConnection(),
      concurrency: CONCURRENCY,
      lockDuration: JOB_TIMEOUT_MS,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[worker] completed job ${job.id}`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[worker] failed job ${job?.id}`, err.message);
  });
  worker.on('error', (err) => {
    console.error('[worker] error', err.message);
  });

  // graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[worker] ${signal} received — draining and closing`);
    await worker.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  console.log('[worker] ready');
}

startWorker().catch((err) => {
  console.error('[worker] failed to start', err);
  process.exit(1);
});
