import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { logger } from './logger';

export interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  byline?: string | undefined;
  siteName?: string | undefined;
  publishedTime?: string | undefined;
  favicon?: string | undefined;
}

export const extractContentFromUrl = async (url: string): Promise<ExtractedContent> => {
  try {
    logger.info(`Fetching content from URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000, 
      maxRedirects: 5
    });

    const html = response.data;
    
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    const metadata = extractMetadata(document, url);

    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to extract readable content from URL');
    }

    return {
      title: article.title || metadata.title || 'Untitled',
      content: article.textContent || '',
      excerpt: article.excerpt || metadata.description || '',
      byline: article.byline || metadata.author,
      siteName: metadata.siteName,
      publishedTime: metadata.publishedTime,
      favicon: metadata.favicon
    };

  } catch (error: any) {
    logger.error(`Failed to extract content from URL: ${url}`, error);
    throw new Error(`URL extraction failed: ${error.message}`);
  }
};

const extractMetadata = (document: Document, url: string) => {
  const getMetaContent = (name: string): string | undefined => {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta?.getAttribute('content') || undefined;
  };

  const title = 
    getMetaContent('og:title') || 
    getMetaContent('twitter:title') || 
    document.querySelector('title')?.textContent || 
    '';

  const description = 
    getMetaContent('og:description') || 
    getMetaContent('twitter:description') || 
    getMetaContent('description') || 
    '';

  const author = 
    getMetaContent('author') || 
    getMetaContent('article:author') || 
    undefined;

  const siteName = 
    getMetaContent('og:site_name') || 
    new URL(url).hostname;

  const publishedTime = 
    getMetaContent('article:published_time') || 
    getMetaContent('datePublished') || 
    undefined;

  const favicon = 
    document.querySelector('link[rel="icon"]')?.getAttribute('href') || 
    document.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') || 
    `${new URL(url).origin}/favicon.ico`;

  return { title, description, author, siteName, publishedTime, favicon };
};
