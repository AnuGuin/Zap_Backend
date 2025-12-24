import prisma from '../../config/db';
import { getEmbeddings } from '../../ai/embeddings';
import { generateText } from '../../ai/llm';
import type { ChatRequestDto, ChatResponseDto } from './chat.types';

export const chatWithKnowledge = async (
  userId: string,
  data: ChatRequestDto
): Promise<ChatResponseDto> => {
  const { message, workspaceId, documentId, history } = data;

  // 1. Generate embedding for the user query
  const embedding = await getEmbeddings(message);
  const vectorString = `[${embedding.join(',')}]`;

  // 2. Retrieve relevant chunks
  // We use a raw query because Prisma doesn't support vector operations natively yet in the typed client
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

  // 3. Construct the prompt
  const context = results.map((r) => r.content).join('\n\n');
  
  const systemPrompt = `You are a helpful AI assistant for the Zapnote workspace.
Use the following context to answer the user's question.
If the answer is not in the context, say you don't know, but try to be helpful.
Keep the answer concise and relevant.

Context:
${context}
`;

  // Format history for the prompt if needed, or just append the current message
  // For simplicity, we'll just use the system prompt + current message for now, 
  // but a real implementation would format the history for the LLM.
  
  let fullPrompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
  
  if (history && history.length > 0) {
     const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
     fullPrompt = `${systemPrompt}\n\n${historyText}\nUser: ${message}\nAssistant:`;
  }

  // 4. Generate response
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
