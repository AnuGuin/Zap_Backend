import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import prisma from '../config/db';
import { generateText } from '../ai/llm';
import { classifyPrompt } from '../ai/prompts/classify';
import { logger } from '../utils/logger';

const worker = new Worker('classify', async (job: Job) => {
  const { documentId, content } = job.data;
  
  try {
    const truncatedContent = content.slice(0, 5000);
    const prompt = classifyPrompt(truncatedContent);
    const category = await generateText(prompt);
    logger.info(`Classified document ${documentId} as ${category}`);

  } catch (error) {
    logger.error(`Classification failed for document ${documentId}`, error);
    throw error;
  }
}, { connection: { url: env.REDIS_URL } });

export default worker;
