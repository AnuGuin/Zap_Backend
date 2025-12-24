import { generativeModel } from '../config/ai';

export const rerankResults = async (query: string, documents: string[]): Promise<string[]> => {
  if (documents.length === 0) return [];

  const prompt = `
You are a search ranking expert. Rank the following documents based on their relevance to the query.
Return the indices of the documents in order of relevance, comma separated (e.g. 0, 2, 1).

Query: ${query}

Documents:
${documents.map((doc, index) => `[${index}] ${doc.slice(0, 200)}...`).join('\n')}

Ranking:
`;

  try {
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const indices = text.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    // Map back to documents
    const rankedDocs: string[] = [];
    indices.forEach(i => {
      if (documents[i]) rankedDocs.push(documents[i]);
    });
    
    // Append any missing docs at the end
    documents.forEach((doc, i) => {
      if (!indices.includes(i)) rankedDocs.push(doc);
    });

    return rankedDocs;
  } catch (error) {
    console.error('Reranking failed, returning original order', error);
    return documents;
  }
};
