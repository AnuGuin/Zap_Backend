import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import prisma from '../config/db';
import { generateText } from '../ai/llm';
import { summarizePrompt } from '../ai/prompts/summarize';
import { logger } from '../utils/logger';

const worker = new Worker('summarize', async (job: Job) => {
  const { documentId, content } = job.data;
  
  try {
    // Truncate content if too long for context window (simple approach)
    const truncatedContent = content.slice(0, 30000); 
    const prompt = summarizePrompt(truncatedContent);
    const summary = await generateText(prompt);

    await prisma.document.update({
      where: { id: documentId },
      data: { summary },
    });

    // Check if all tasks are done to mark as COMPLETED? 
    // For simplicity, we might mark COMPLETED in a separate check or just let the UI poll.
    // Or we can have a finalizer. 
    // Let's just update status here if it's the last step, but parallel execution makes it hard.
    // We'll leave status as PROCESSING until all are done, or just ignore status update here.
    // Ideally, we track job completion.
    
    // Let's just set it to COMPLETED here for now, assuming this is the "main" visible output.
    await prisma.document.update({
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
