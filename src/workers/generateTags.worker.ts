import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import prisma from '../config/db';
import { generateText } from '../ai/llm';
import { generateTagsPrompt } from '../ai/prompts/generateTags';
import { logger } from '../utils/logger';

interface TagGenerationData {
  documentId: string;
  content: string;
  userIntent: string;
}

const worker = new Worker('generate-tags', async (job: Job<TagGenerationData>) => {
  const { documentId, content, userIntent } = job.data;
  
  try {
    logger.info(`Generating tags for document ${documentId}`);
    
    const prompt = generateTagsPrompt(content, userIntent);
    const response = await generateText(prompt);
    
    let tags: string[] = [];
    try {
      const cleanResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      tags = JSON.parse(cleanResponse);
      
      if (!Array.isArray(tags)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      logger.error(`Failed to parse tags response for document ${documentId}`, parseError);
      tags = response.split(',').map(t => t.trim().replace(/["\[\]]/g, '')).filter(t => t.length > 0).slice(0, 7);
    }

    await prisma.$transaction(async (tx) => {
      for (const tagName of tags) {
        const normalizedTag = tagName.toLowerCase().trim();
        
        await tx.tag.upsert({
          where: { name: normalizedTag },
          create: { name: normalizedTag },
          update: {},
        });

        await tx.knowledgeItem.update({
          where: { id: documentId },
          data: {
            tags: {
              connect: { name: normalizedTag }
            }
          }
        });
      }
    });

    logger.info(`Successfully generated and attached ${tags.length} tags to document ${documentId}: ${tags.join(', ')}`);

  } catch (error) {
    logger.error(`Tag generation failed for document ${documentId}`, error);
    throw error;
  }
}, { connection: { url: env.REDIS_URL } });

export default worker;
