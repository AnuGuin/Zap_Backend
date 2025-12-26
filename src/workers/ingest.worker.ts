import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import prisma from '../config/db';
import { chunkText } from '../utils/chunker';
import { embedQueue, summarizeQueue, classifyQueue, enrichmentQueue, generateTagsQueue } from '../events/queue';
import { logger } from '../utils/logger';
import { extractContentFromUrl } from '../utils/urlExtractor';

interface IngestJobData {
  documentId: string;
  url?: string;
  userIntent?: string;
}

const worker = new Worker('ingest', async (job: Job<IngestJobData>) => {
  const { documentId, url, userIntent } = job.data;
  logger.info(`Starting ingestion for document ${documentId}`);

  try {
    let document = await prisma.knowledgeItem.findUnique({ where: { id: documentId } });
    if (!document) throw new Error('Document not found');

    await prisma.knowledgeItem.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    let content = document.content || '';
    let title = document.title;
    let metadata = document.metadata as any || {};

    if (url) {
      logger.info(`Extracting content from URL: ${url}`);
      const extracted = await extractContentFromUrl(url);
      
      content = extracted.content;
      title = extracted.title;
      
      metadata = {
        ...metadata,
        excerpt: extracted.excerpt,
        byline: extracted.byline,
        siteName: extracted.siteName,
        publishedTime: extracted.publishedTime,
        favicon: extracted.favicon,
        userIntent: userIntent || ''
      };

      // Update document with extracted content
      await prisma.knowledgeItem.update({
        where: { id: documentId },
        data: {
          content,
          title,
          metadata,
          type: 'URL'
        }
      });
      
      document = await prisma.knowledgeItem.findUnique({ where: { id: documentId } });
      if (!document) throw new Error('Document not found after update');
    }

    if (!content) {
      throw new Error('No content available for processing');
    }

    const chunks = chunkText(content);
    
    const createdChunks = await prisma.$transaction(
      chunks.map((chunkContent) => 
        prisma.documentChunk.create({
          data: {
            content: chunkContent,
            knowledgeItemId: documentId,
          },
        })
      )
    );

    await embedQueue.addBulk(
      createdChunks.map((chunk) => ({
        name: 'embed-chunk',
        data: { chunkId: chunk.id, content: chunk.content },
      }))
    );

    await summarizeQueue.add('summarize-doc', { documentId, content });

    await classifyQueue.add('classify-doc', { documentId, content });

    await enrichmentQueue.add('enrich', {
      documentId: document.id,
      content 
    });

    // Add tag generation job
    if (userIntent) {
      await generateTagsQueue.add('generate-tags', {
        documentId,
        content,
        userIntent
      });
      logger.info(`Tag generation queued for document ${documentId}`);
    }

    logger.info(`Ingestion steps queued for document ${documentId}`);

  } catch (error) {
    logger.error(`Ingestion failed for document ${documentId}`, error);
    await prisma.knowledgeItem.update({
      where: { id: documentId },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}, { connection: { url: env.REDIS_URL } });

export default worker;
