# Zapnote API Documentation

## Overview
The Knowledge API of Zapnote accepts URLs and user intent to automatically process, extract, summarize, and tag web content.

## Endpoint

### POST /api/knowledge/:workspaceId/knowledge

Creates a new knowledge item from a URL.

#### Request Body
```json
{
  "url": "https://example.com/article",
  "intent": "Learning about machine learning basics for my project"
}
```

#### Parameters
- `url` (required): The URL of the web page to save
- `intent` (required): User's purpose for saving this content (used by AI to generate relevant tags)

#### Response
```json
{
  "message": "Knowledge item created and processing started",
  "data": {
    "id": "uuid",
    "title": "Processing...",
    "sourceUrl": "https://example.com/article",
    "workspaceId": "workspace-uuid",
    "status": "PENDING",
    "type": "URL",
    "metadata": {
      "userIntent": "Learning about machine learning basics for my project"
    },
    "createdAt": "2025-12-26T...",
    "updatedAt": "2025-12-26T..."
  }
}
```

## Processing Pipeline

When a URL is submitted, the following happens automatically:

1. **URL Content Extraction**
   - Fetches the webpage
   - Extracts main content using Mozilla Readability
   - Extracts metadata (title, author, published date, etc.)

2. **Content Chunking**
   - Splits content into semantic chunks
   - Prepares for vector embedding

3. **Vector Embedding**
   - Generates embeddings for each chunk
   - Enables semantic search

4. **AI Summarization**
   - Creates a concise summary of the content
   - Stored in the `summary` field

5. **Content Classification**
   - Categorizes content (Technical, Business, Personal, News, Other)

6. **Entity Extraction**
   - Identifies key entities (People, Organizations, Technologies)
   - Links to knowledge graph

7. **Automatic Tag Generation** ⭐ NEW
   - AI analyzes content and user intent
   - Generates 3-7 relevant tags
   - Tags are created and linked automatically

## List Knowledge Items

### GET /api/knowledge/:workspaceId/knowledge

Returns all knowledge items with their tags.

#### Response
```json
[
  {
    "id": "uuid",
    "title": "Introduction to Machine Learning",
    "sourceUrl": "https://example.com/ml-intro",
    "summary": "A comprehensive guide to...",
    "status": "COMPLETED",
    "type": "URL",
    "tags": [
      { "id": "tag-1", "name": "machine learning" },
      { "id": "tag-2", "name": "python" },
      { "id": "tag-3", "name": "beginner-friendly" }
    ],
    "_count": {
      "chunks": 15
    },
    "createdAt": "2025-12-26T...",
    "updatedAt": "2025-12-26T..."
  }
]
```

## Get Single Knowledge Item

### GET /api/knowledge/:workspaceId/knowledge/:id

Returns detailed information about a knowledge item.

#### Response
```json
{
  "id": "uuid",
  "title": "Introduction to Machine Learning",
  "content": "Full extracted content...",
  "summary": "A comprehensive guide...",
  "sourceUrl": "https://example.com/ml-intro",
  "type": "URL",
  "status": "COMPLETED",
  "metadata": {
    "userIntent": "Learning about ML for my project",
    "excerpt": "Short excerpt...",
    "byline": "John Doe",
    "siteName": "example.com",
    "publishedTime": "2025-01-01",
    "favicon": "https://example.com/favicon.ico"
  },
  "chunks": [
    {
      "id": "chunk-1",
      "content": "Chunk content...",
      "embedding": "[...]"
    }
  ],
  "tags": [
    { "id": "tag-1", "name": "machine learning" },
    { "id": "tag-2", "name": "python" }
  ],
  "entities": [
    {
      "entity": {
        "id": "entity-1",
        "name": "TensorFlow",
        "type": "Technology",
        "description": "Open source ML framework"
      },
      "confidence": 0.95
    }
  ],
  "createdAt": "2025-12-26T...",
  "updatedAt": "2025-12-26T..."
}
```

## Status Values

- `PENDING`: Initial state, waiting to start processing
- `PROCESSING`: Currently being processed by workers
- `COMPLETED`: All processing finished successfully
- `FAILED`: Processing encountered an error

## Examples

### cURL Example
```bash
curl -X POST https://api.zapnote.com/api/knowledge/workspace-123/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://blog.example.com/ai-trends-2025",
    "intent": "Research for my AI trends report"
  }'
```

### JavaScript/Fetch Example
```javascript
const response = await fetch('https://api.zapnote.com/api/knowledge/workspace-123/knowledge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    url: 'https://blog.example.com/ai-trends-2025',
    intent: 'Research for my AI trends report'
  })
});

const data = await response.json();
console.log(data);
```

## Notes

- The AI will generate tags based on both the content and your stated intent
- You don't need to manually specify tags anymore
- Processing is asynchronous - check the `status` field to see when it's complete
- The system uses Mozilla Readability to extract clean, readable content from web pages
- Metadata is automatically extracted and stored
