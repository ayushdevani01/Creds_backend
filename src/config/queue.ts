import { Queue } from 'bullmq';
import { redis } from './redis';

export const publish_queue = new Queue('publish', {
  connection: redis,
  defaultJobOptions: {
    attempts: 4, // 1 initial + 3 retries → backoff: 1s → 5s → 25s (all 3 delays used)
    backoff: { type: 'custom' },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
