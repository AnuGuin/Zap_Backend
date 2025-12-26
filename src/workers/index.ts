import ingestWorker from './ingest.worker';
import embedWorker from './embed.worker';
import summarizeWorker from './summarize.worker';
import classifyWorker from './classify.worker';
import enrichmentWorker from './enrichment.worker';
import generateTagsWorker from './generateTags.worker';
import { logger } from '../utils/logger';

logger.info('All workers initialized');

export {
  ingestWorker,
  embedWorker,
  summarizeWorker,
  classifyWorker,
  enrichmentWorker,
  generateTagsWorker,
};
