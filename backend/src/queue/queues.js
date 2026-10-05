const { Queue } = require('bullmq');
const { getRedisConnection } = require('./connection');

const QUEUE_NAME = process.env.PROVENANCE_QUEUE_NAME || 'c2pa-injection';

let queue = null;
let testQueue = null; // mock queue injected by tests

function getProvenanceQueue() {
  if (testQueue) return testQueue;
  if (queue) return queue;
  queue = new Queue(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  });
  return queue;
}

// inject a mock queue in test environments without requiring live Redis
function setQueueForTests(mock) {
  testQueue = mock;
}

// enqueue with deterministic job id so re-enqueue is idempotent in BullMQ
async function enqueueProvenanceJob(jobRow) {
  const q = getProvenanceQueue();
  const job = await q.add(
    'provenance',
    {
      jobId: jobRow.id,
      assetId: jobRow.asset_id,
      contractId: jobRow.contract_id,
      workspaceId: jobRow.workspace_id,
    },
    { jobId: jobRow.id },
  );
  return job.id;
}

module.exports = { getProvenanceQueue, enqueueProvenanceJob, setQueueForTests, QUEUE_NAME };
