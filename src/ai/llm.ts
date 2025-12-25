import { generativeModel } from '../config/ai';
import redisClient from '../config/redis';
import prisma from '../config/db';
import crypto from 'crypto';

interface AIRequestOptions {
  workspaceId?: string;
  action?: string;
  useCache?: boolean;
}

export const generateText = async (prompt: string, options: AIRequestOptions = {}): Promise<string> => {
  const { workspaceId, action = 'unknown', useCache = true } = options;
  
  const cacheKey = `ai:llm:${crypto.createHash('md5').update(prompt).digest('hex')}`;
  if (useCache) {
    const cached = await redisClient.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (useCache && text) {
      await redisClient.set(cacheKey, text, { EX: 86400 });
    }

    if (workspaceId) {
      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil(text.length / 4);
      
      prisma.aIUsage.create({
        data: {
          workspaceId,
          action,
          model: 'gemini-pro',
          tokens: inputTokens + outputTokens,
        },
      }).catch(err => console.error('Failed to track AI usage:', err));
    }

    return text;
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
};
