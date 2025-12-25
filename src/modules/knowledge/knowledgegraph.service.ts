import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface KGResponse {
  itemListElement: Array<{
    result: {
      '@id': string;
      name: string;
      description?: string;
      detailedDescription?: { articleBody: string; url: string };
      image?: { contentUrl: string };
      '@type': string[];
    };
    resultScore: number;
  }>;
}

export const KnowledgeGraphService = {
  async searchEntity(query: string) {
    if (!env.GOOGLE_API_KEY) {
      logger.warn('Skipping KG Search: GOOGLE_API_KEY is missing');
      return null;
    }

    try {
      const url = 'https://kgsearch.googleapis.com/v1/entities:search';
      const response = await axios.get<KGResponse>(url, {
        params: {
          query,
          key: env.GOOGLE_API_KEY,
          limit: 1,
          indent: true,
        },
      });

      const item = response.data.itemListElement[0];
      if (!item) return null;

      return {
        kgId: item.result['@id'],
        name: item.result.name,
        description: item.result.detailedDescription?.articleBody || item.result.description,
        imageUrl: item.result.image?.contentUrl,
        url: item.result.detailedDescription?.url,
        type: item.result['@type']?.[0] || 'Thing',
        score: item.resultScore,
      };
    } catch (error) {
      logger.error(`KG Search failed for "${query}"`, error);
      return null;
    }
  }
};