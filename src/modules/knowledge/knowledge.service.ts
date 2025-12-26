import prisma from '../../config/db';
import { ingestQueue } from '../../events/queue';
import type { CreateDocumentDto } from './knowledge.types';

export const createDocument = async (userId: string, data: CreateDocumentDto) => {
  const document = await prisma.knowledgeItem.create({
    data: {
      title: 'Processing...', 
      sourceUrl: data.url,
      workspaceId: data.workspaceId,
      createdById: userId,
      status: 'PENDING',
      type: 'URL',
      metadata: {
        userIntent: data.intent
      }
    },
  });

  await ingestQueue.add('ingest-doc', { 
    documentId: document.id,
    url: data.url,
    userIntent: data.intent
  });

  return document;
};

export const getDocument = async (id: string) => {
  return prisma.knowledgeItem.findUnique({
    where: { id },
    include: { 
      chunks: true,
      tags: true,
      entities: {
        include: {
          entity: true
        }
      }
    },
  });
};

export const listDocuments = async (workspaceId: string) => {
  return prisma.knowledgeItem.findMany({
    where: { workspaceId },
    include: {
      tags: true,
      _count: {
        select: {
          chunks: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
};
