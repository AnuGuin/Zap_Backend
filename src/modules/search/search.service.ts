import prisma from '../../config/db';
import { getEmbeddings } from '../../ai/embeddings';
import { rerankResults } from '../../ai/rerank';

export const searchKnowledge = async (workspaceId: string, query: string, limit: number = 10) => {

  const embedding = await getEmbeddings(query);
  const vectorString = `[${embedding.join(',')}]`;

  const results = await prisma.$queryRaw`
    SELECT 
      chunk.id, 
      chunk.content, 
      chunk."documentId", 
      1 - (chunk.embedding <=> ${vectorString}::vector) as similarity
    FROM "DocumentChunk" AS chunk
    JOIN "Document" AS doc ON chunk."documentId" = doc.id
    WHERE doc."workspaceId" = ${workspaceId}
    ORDER BY similarity DESC
    LIMIT ${limit * 2} 
  ` as any[];

  const docsContent = results.map((r: any) => r.content);
  const rerankedContent = await rerankResults(query, docsContent);

  
  return results.sort((a, b) => {
    const indexA = rerankedContent.indexOf(a.content);
    const indexB = rerankedContent.indexOf(b.content);

    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  }).slice(0, limit);
};
