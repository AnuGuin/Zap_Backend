import { embeddingModel } from '../config/ai';

export const getEmbeddings = async (text: string): Promise<number[]> => {
 
  try {
    const result = await embeddingModel.generateContent({
      contents: [{ role: 'user', parts: [{ text }] }],
    });
    
    
    // @ts-ignore - generic typing might miss specific model methods
    const response = await embeddingModel.embedContent(text);
    return response.embedding.values;

  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
};
