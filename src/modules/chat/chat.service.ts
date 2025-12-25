import prisma from '../../config/db';
import { getEmbeddings } from '../../ai/embeddings';
import { generateText } from '../../ai/llm';
import type { ChatRequestDto, ChatResponseDto } from './chat.types';

export const chatWithKnowledge = async (
  userId: string,
  data: ChatRequestDto
): Promise<ChatResponseDto> => {
  const { message, workspaceId, documentId, history } = data;

  const embedding = await getEmbeddings(message);
  const vectorString = `[${embedding.join(',')}]`;


  let results: any[] = [];

  if (documentId) {
    results = await prisma.$queryRaw`
      SELECT 
        chunk.id, 
        chunk.content, 
        chunk."documentId", 
        1 - (chunk.embedding <=> ${vectorString}::vector) as similarity
      FROM "DocumentChunk" AS chunk
      WHERE chunk."documentId" = ${documentId}
      ORDER BY similarity DESC
      LIMIT 5
    `;
  } else {
    results = await prisma.$queryRaw`
      SELECT 
        chunk.id, 
        chunk.content, 
        chunk."documentId", 
        1 - (chunk.embedding <=> ${vectorString}::vector) as similarity
      FROM "DocumentChunk" AS chunk
      JOIN "Document" AS doc ON chunk."documentId" = doc.id
      WHERE doc."workspaceId" = ${workspaceId}
      ORDER BY similarity DESC
      LIMIT 5
    `;
  }

  const context = results.map((r) => r.content).join('\n\n');
  
  const systemPrompt = `You are a helpful AI assistant for the Zapnote workspace.
Use the following context to answer the user's question.
If the answer is not in the context, say you don't know, but try to be helpful.
Keep the answer concise and relevant.

Context:
${context}
`;


  
  let fullPrompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
  
  if (history && history.length > 0) {
     const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
     fullPrompt = `${systemPrompt}\n\n${historyText}\nUser: ${message}\nAssistant:`;
  }

  const responseText = await generateText(fullPrompt);

  return {
    response: responseText,
    sources: results.map(r => ({
      id: r.id,
      content: r.content,
      documentId: r.documentId,
      similarity: r.similarity
    }))
  };
};
