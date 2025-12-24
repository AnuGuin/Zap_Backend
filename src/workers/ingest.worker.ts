import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import prisma from '../config/db';
import { chunkText } from '../utils/chunker';
import { embedQueue, summarizeQueue, classifyQueue } from '../events/queue';
import { logger } from '../utils/logger';

const worker = new Worker('ingest', async (job: Job) => {
  const { documentId } = job.data;
  logger.info(`Starting ingestion for document ${documentId}`);

  try {
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new Error('Document not found');

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    // 1. Chunking
    const chunks = chunkText(document.content);
    
    // 2. Create chunks in DB (without embeddings yet)
    // We create them first so we have IDs to pass to embed worker
    const createdChunks = await prisma.$transaction(
      chunks.map((content) => 
        prisma.documentChunk.create({
          data: {
            content,
            documentId,
          },
        })
      )
    );

    // 3. Queue Embedding Jobs
    await embedQueue.addBulk(
      createdChunks.map((chunk) => ({
        name: 'embed-chunk',
        data: { chunkId: chunk.id, content: chunk.content },
      }))
    );

    // 4. Queue Summarization
    await summarizeQueue.add('summarize-doc', { documentId, content: document.content });

    // 5. Queue Classification
    await classifyQueue.add('classify-doc', { documentId, content: document.content });

    logger.info(`Ingestion steps queued for document ${documentId}`);

  } catch (error) {
    logger.error(`Ingestion failed for document ${documentId}`, error);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}, { connection: { url: env.REDIS_URL } });

export default worker;
