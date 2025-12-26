import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import prisma from '../config/db';
import { generateText } from '../ai/llm';
import { summarizePrompt } from '../ai/prompts/summarize';
import { logger } from '../utils/logger';

const worker = new Worker('summarize', async (job: Job) => {
  const { documentId, content } = job.data;
  
  try {
    
    const truncatedContent = content.slice(0, 30000); 
    const prompt = summarizePrompt(truncatedContent);
    const summary = await generateText(prompt);

    await prisma.knowledgeItem.update({
      where: { id: documentId },
      data: { summary },
    });

    await prisma.knowledgeItem.update({
      where: { id: documentId },
      data: { status: 'COMPLETED' },
    });

    logger.info(`Summarized document ${documentId}`);
  } catch (error) {
    logger.error(`Summarization failed for document ${documentId}`, error);
    throw error;
  }
}, { connection: { url: env.REDIS_URL } });

export default worker;
