import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import prisma from '../config/db';
import { generateText } from '../ai/llm';
import { extractEntitiesPrompt } from '../ai/prompts/extractEntities';
import { KnowledgeGraphService } from '../modules/knowledge/knowledgegraph.service';
import { logger } from '../utils/logger';

const worker = new Worker('enrichment', async (job: Job) => {
  const { documentId, content } = job.data;
  logger.info(`Starting enrichment for url ${documentId}`);

  try {
    const prompt = extractEntitiesPrompt(content);
    const rawResponse = await generateText(prompt);
    
    const cleanJson = rawResponse.replace(/```json|```/g, '').trim();
    let entityNames: string[] = [];
    
    try {
      entityNames = JSON.parse(cleanJson);
    } catch (e) {
      logger.warn(`Failed to parse entity JSON for ${documentId}`, e);
      return;
    }

    if (!Array.isArray(entityNames)) return;

    for (const name of entityNames) {
      const kgData = await KnowledgeGraphService.searchEntity(name);
      
      if (kgData && kgData.score > 50) { 
        const entity = await prisma.entity.upsert({
          where: { kgId: kgData.kgId },
          update: {
            ...(kgData.description && { description: kgData.description }),
            ...(kgData.imageUrl && { imageUrl: kgData.imageUrl }),
            ...(kgData.url && { url: kgData.url }),
          },
          create: {
            kgId: kgData.kgId,
            name: kgData.name,
            description: kgData.description || null,
            imageUrl: kgData.imageUrl || null,
            url: kgData.url || null,
            type: kgData.type || 'Concept'
          }
        });
        
        await prisma.entityOnDocument.create({
          data: {
            documentId,
            entityId: entity.id,
            confidence: kgData.score / 100
          }
        }).catch(() => {
          // Ignore unique constraint violation (already linked)
        });
        
        logger.info(`Linked entity "${kgData.name}" to doc ${documentId}`);
      }
    }

  } catch (error) {
    logger.error(`Enrichment failed for ${documentId}`, error);
    throw error;
  }
}, { connection: { url: env.REDIS_URL } });

export default worker;