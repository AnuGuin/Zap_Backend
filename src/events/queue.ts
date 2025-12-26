import { Queue } from 'bullmq';
import { env } from '../config/env';

const connection = {
  url: env.REDIS_URL,
};

export const ingestQueue = new Queue('ingest', { connection });
export const summarizeQueue = new Queue('summarize', { connection });
export const embedQueue = new Queue('embed', { connection });
export const classifyQueue = new Queue('classify', { connection });
export const enrichmentQueue = new Queue('enrichment', { connection });
export const generateTagsQueue = new Queue('generate-tags', { connection });

export const queues = {
  ingest: ingestQueue,
  summarize: summarizeQueue,
  embed: embedQueue,
  classify: classifyQueue,
  enrichmentQueue: enrichmentQueue,
  generateTags: generateTagsQueue
};
