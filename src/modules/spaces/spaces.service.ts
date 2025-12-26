import prisma from '../../config/db';
import { generateText } from '../../ai/llm';
import { getEmbeddings } from '../../ai/embeddings';

export const suggestRelatedKnowledge = async (workspaceId: string, spaceId: string) => {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { elements: true },
  });

  if (!space) throw new Error('Space not found');

  const spaceContent = space.elements
    .map((el: any) => {
      const content = el.content as any;
      return content.text || '';
    })
    .join('\n')
    .slice(0, 5000);

  if (!spaceContent) return [];

  const embedding = await getEmbeddings(spaceContent);
  const vectorString = `[${embedding.join(',')}]`;

  const chunks = await prisma.$queryRaw`
    SELECT 
      doc.id as "documentId",
      doc.title,
      chunk.content,
      1 - (chunk.embedding <=> ${vectorString}::vector) as similarity
    FROM "DocumentChunk" AS chunk
    JOIN "Document" AS doc ON chunk."documentId" = doc.id
    WHERE doc."workspaceId" = ${workspaceId}
    ORDER BY similarity DESC
    LIMIT 10
  ` as any[];

  const uniqueDocs = Array.from(new Set(chunks.map(c => c.documentId)))
    .map(id => chunks.find(c => c.documentId === id))
    .slice(0, 5);

  const suggestions = await Promise.all(uniqueDocs.map(async (doc) => {
    const prompt = `
      Context: Space content: "${spaceContent.slice(0, 500)}..."
      Candidate Document: "${doc.title}" - Content: "${doc.content.slice(0, 300)}..."
      
      Task: Explain briefly (1 sentence) why this document is relevant to the space.
    `;
    
    const explanation = await generateText(prompt, { 
      workspaceId, 
      action: 'suggest-knowledge' 
    });

    return {
      documentId: doc.documentId,
      title: doc.title,
      explanation,
      similarity: doc.similarity
    };
  }));

  return suggestions;
};

export const compareSpaces = async (workspaceId: string, spaceId1: string, spaceId2: string) => {
  const [s1, s2] = await Promise.all([
    prisma.space.findUnique({ where: { id: spaceId1 }, include: { elements: true } }),
    prisma.space.findUnique({ where: { id: spaceId2 }, include: { elements: true } })
  ]);

  if (!s1 || !s2) throw new Error('Space not found');

  const c1 = s1.elements.map((e: any) => (e.content as any).text || '').join('\n').slice(0, 3000);
  const c2 = s2.elements.map((e: any) => (e.content as any).text || '').join('\n').slice(0, 3000);

  const prompt = `
    Compare these two knowledge spaces:
    Space A (${s1.name}): ${c1}
    Space B (${s2.name}): ${c2}

    Identify:
    1. Common themes
    2. Conflicting information (if any)
    3. How they relate to each other

    Format as JSON: { "themes": [], "conflicts": [], "relationship": "" }
  `;

  const response = await generateText(prompt, { workspaceId, action: 'compare-spaces' });
  
  try {
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return { raw: response };
  }
};

export const suggestEdges = async (workspaceId: string, spaceId: string) => {
  const space = await prisma.space.findUnique({ 
    where: { id: spaceId }, 
    include: { elements: true } 
  });

  if (!space) throw new Error('Space not found');

  const elements = space.elements.map((e: any) => ({
    id: e.id,
    text: (e.content as any).text || ''
  })).filter(e => e.text.length > 10).slice(0, 10); 

  if (elements.length < 2) return [];

  const prompt = `
    Analyze these nodes in a knowledge graph:
    ${elements.map(e => `[${e.id}]: ${e.text.slice(0, 100)}`).join('\n')}

    Suggest relationships between them.
    Types: SUPPORTS, CONTRADICTS, RELATED
    
    Return JSON array: [{ "sourceId": "...", "targetId": "...", "type": "...", "reason": "..." }]
  `;

  const response = await generateText(prompt, { workspaceId, action: 'suggest-edges' });

  try {
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return [];
  }
};

export const detectGaps = async (workspaceId: string, spaceId: string) => {
  const space = await prisma.space.findUnique({ 
    where: { id: spaceId }, 
    include: { elements: true } 
  });

  if (!space) throw new Error('Space not found');

  const content = space.elements.map((e: any) => (e.content as any).text || '').join('\n').slice(0, 5000);

  const prompt = `
    Analyze this knowledge space content:
    "${content}"

    Identify:
    1. Weakly covered concepts that seem important but are missing detail.
    2. Missing prerequisite knowledge that a reader would need.
    
    Return JSON: { "weakConcepts": [], "missingPrerequisites": [], "suggestions": [] }
  `;

  const response = await generateText(prompt, { workspaceId, action: 'detect-gaps' });

  try {
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return { raw: response };
  }
};
