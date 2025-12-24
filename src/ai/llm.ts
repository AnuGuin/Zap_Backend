import { generativeModel } from '../config/ai';

export const generateText = async (prompt: string): Promise<string> => {
  try {
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || '';
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
};
