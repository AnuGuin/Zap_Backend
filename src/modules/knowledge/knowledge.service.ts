import prisma from '../../config/db';
import { ingestQueue } from '../../events/queue';
import type { CreateDocumentDto } from './knowledge.types';

export const createDocument = async (userId: string, data: CreateDocumentDto) => {
  const document = await prisma.document.create({
    data: {
      title: data.title,
      content: data.content,
      workspaceId: data.workspaceId,
      status: 'PENDING',
    },
  });


  await ingestQueue.add('ingest-doc', { documentId: document.id });

  return document;
};

export const getDocument = async (id: string) => {
  return prisma.document.findUnique({
    where: { id },
    include: { chunks: true },
  });
};

export const listDocuments = async (workspaceId: string) => {
  return prisma.document.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
};
