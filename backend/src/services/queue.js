import { Queue } from 'bullmq';
import Redis from 'ioredis';
import logger from '../../utils/logger.js';

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

// Create BullMQ queue
export const videoQueue = new Queue('video-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 3600 * 24 // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      age: 3600 * 24 * 7 // Keep failed jobs for 7 days
    }
  }
});

// Queue event listeners
videoQueue.on('error', (error) => {
  logger.error('Video queue error:', error);
});

logger.info('Video generation queue initialized');

export default videoQueue;
