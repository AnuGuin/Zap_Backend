import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import prisma from '../config/db';
import { getEmbeddings } from '../ai/embeddings';
import { logger } from '../utils/logger';

const worker = new Worker('embed', async (job: Job) => {
  const { chunkId, content } = job.data;
  
  try {
    const embedding = await getEmbeddings(content);
    
    const vectorString = `[${embedding.join(',')}]`;
    
    await prisma.$executeRaw`
      UPDATE "DocumentChunk"
      SET embedding = ${vectorString}::vector
      WHERE id = ${chunkId}
    `;

    logger.info(`Embedded chunk ${chunkId}`);
  } catch (error) {
    logger.error(`Embedding failed for chunk ${chunkId}`, error);
    throw error;
  }
}, { connection: { url: env.REDIS_URL } });

export default worker;
