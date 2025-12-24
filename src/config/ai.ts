import { VertexAI } from '@google-cloud/vertexai';
import { env } from './env';

const vertexAI = new VertexAI({
  project: env.GOOGLE_PROJECT_ID,
  location: env.GOOGLE_LOCATION,
});

export const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-pro',
});

export const embeddingModel = vertexAI.getGenerativeModel({
  model: 'text-embedding-004',
});

export default vertexAI;
