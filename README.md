# Zapnote Node Backend

AI-powered knowledge management system with intelligent URL-based content extraction, semantic search, and RAG capabilities.

## Features

- 🔗 **URL-Based Knowledge Extraction** - Automatically fetch and process content from any URL
- 🤖 **AI-Powered Processing** - Automatic summarization, tagging, and entity extraction
- 🔍 **Semantic Search** - Vector-based search across all knowledge items
- 💬 **RAG Chat** - Context-aware chat with your knowledge base
- 🏷️ **Smart Tagging** - AI generates relevant tags based on content and user intent
- 🌐 **Entity Enrichment** - Automatic entity extraction with Google Knowledge Graph
- 👥 **Multi-Workspace** - Organize knowledge across different workspaces
- 🔐 **Firebase Auth** - Secure authentication with role-based access control

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL + pgvector
- **Queue**: BullMQ + Redis
- **AI**: Google Vertex AI (Gemini)
- **Auth**: Firebase Admin SDK
- **Content Extraction**: Mozilla Readability + JSDOM
- **Entity Enrichment**: Google Knowledge Graph API

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Redis 6+
- Google Cloud Project with Vertex AI enabled
- Firebase Project for authentication
- Google API Key for Knowledge Graph (optional)

## Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=3000
   
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/zapnote
   
   # Redis
   REDIS_URL=redis://localhost:6379
   
   # Google Cloud (Vertex AI)
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_LOCATION=us-central1
   GOOGLE_API_KEY=your-google-api-key  # For Knowledge Graph
   
   # Firebase
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

3. **Set up the database**
   ```bash
   # Enable pgvector extension in PostgreSQL
   psql -d zapnote -c "CREATE EXTENSION IF NOT EXISTS vector;"
   
   # Run migrations
   npx prisma migrate dev
   
   # Generate Prisma client
   npx prisma generate
   ```

4. **Start Redis** (if not already running)
   ```bash
   redis-server
   ```

5. **Run the server**
   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Production build
   npm run build
   npm start
   ```

## Architecture

### Request Flow

```
User Request → Express API → Prisma → PostgreSQL
                    ↓
                BullMQ Queue → Redis
                    ↓
            Background Workers
                    ↓
        AI Services (Vertex AI, Knowledge Graph)
                    ↓
            Database Updates
```

### Background Workers

All processing happens asynchronously through BullMQ workers:

1. **Ingest Worker** - Extracts content from URLs, creates chunks
2. **Embed Worker** - Generates vector embeddings for chunks
3. **Summarize Worker** - Creates AI-powered summaries
4. **Classify Worker** - Classifies content type and topics
5. **Enrichment Worker** - Extracts entities and enriches with Knowledge Graph
6. **Generate Tags Worker** - Creates relevant tags based on content + user intent

### Project Structure

```
src/
├── ai/                    # AI service integrations
│   ├── embeddings.ts      # Vector embedding generation
│   ├── llm.ts            # LLM text generation
│   ├── rerank.ts         # Search result reranking
│   └── prompts/          # AI prompts
├── config/               # Configuration files
│   ├── ai.ts            # AI models config
│   ├── db.ts            # Database connection
│   ├── env.ts           # Environment validation
│   ├── firebase.ts      # Firebase Admin setup
│   └── redis.ts         # Redis connection
├── events/              # Event/Queue management
│   ├── events.ts        # Event emitter
│   └── queue.ts         # BullMQ queues
├── modules/             # Feature modules
│   ├── auth/            # Authentication middleware
│   ├── chat/            # RAG chat functionality
│   ├── knowledge/       # Knowledge item management
│   ├── search/          # Semantic search
│   └── spaces/          # Workspace spaces
├── utils/               # Utility functions
│   ├── chunker.ts       # Text chunking
│   ├── cleaner.ts       # Content cleaning
│   ├── logger.ts        # Winston logger
│   ├── rateLimiter.ts   # Rate limiting
│   └── urlExtractor.ts  # URL content extraction
├── workers/             # Background workers
│   ├── classify.worker.ts
│   ├── embed.worker.ts
│   ├── enrichment.worker.ts
│   ├── generateTags.worker.ts
│   ├── ingest.worker.ts
│   ├── summarize.worker.ts
│   └── index.ts         # Worker initialization
├── app.ts               # Express app setup
└── server.ts            # Server entry point

prisma/
├── schema.prisma        # Database schema
├── seed.ts             # Database seeder
└── migrations/         # Migration files
```

## API Documentation

See [apispec.txt](apispec.txt) for complete API documentation.

### Quick Start

1. **Create a knowledge item from URL**
   ```bash
   POST /api/knowledge/{workspaceId}/knowledge
   {
     "url": "https://example.com/article",
     "intent": "Research for my AI project"
   }
   ```

2. **List knowledge items**
   ```bash
   GET /api/knowledge/{workspaceId}/knowledge
   ```

3. **Search across knowledge base**
   ```bash
   POST /api/search/{workspaceId}
   {
     "query": "machine learning basics",
     "limit": 10
   }
   ```

4. **Chat with RAG**
   ```bash
   POST /api/chat/{workspaceId}
   {
     "message": "What is machine learning?",
     "history": []
   }
   ```

## Authentication

The API uses Firebase ID tokens for authentication:

1. User signs in via Firebase (client-side)
2. Client obtains ID token
3. Client includes token in `Authorization: Bearer <token>` header
4. Backend verifies token and creates/updates user in database

### Role-Based Access Control

- **OWNER** - Full access, can manage workspace members
- **EDITOR** - Can create and edit knowledge items
- **VIEWER** - Read-only access

## Database Schema

Key models:

- **User** - User accounts linked to Firebase
- **Workspace** - Container for knowledge items and members
- **WorkspaceMember** - User-workspace association with roles
- **KnowledgeItem** - Main knowledge entity (from URLs, PDFs, etc.)
- **DocumentChunk** - Text chunks with vector embeddings
- **Entity** - Extracted entities (people, organizations, concepts)
- **Tag** - User and AI-generated tags
- **Space** - Canvas-like spaces for visual organization

## Development

### Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run type-check   # TypeScript type checking
```

### Database Management

```bash
npx prisma migrate dev --name <migration-name>  # Create migration
npx prisma migrate deploy                       # Apply migrations
npx prisma generate                            # Regenerate client
npx prisma studio                              # Open Prisma Studio
```

### Monitoring

- Check worker logs in console
- Monitor Redis queues: `redis-cli KEYS '*'`
- View queue status in BullMQ dashboard (if configured)

## Environment Configuration

### Required Services

1. **PostgreSQL with pgvector**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Redis** - For job queues
   ```bash
   redis-server
   ```

3. **Google Cloud**
   - Enable Vertex AI API
   - Create service account with Vertex AI permissions
   - Set up application default credentials

4. **Firebase**
   - Create Firebase project
   - Generate service account key
   - Add private key to .env

5. **Google Knowledge Graph** (Optional)
   - Get API key from Google Cloud Console
   - Add to .env as GOOGLE_API_KEY

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong database credentials
- [ ] Enable Redis persistence
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Set up SSL/TLS
- [ ] Enable CORS for your domains
- [ ] Set up database backups
- [ ] Configure worker concurrency
- [ ] Set up health check monitoring

### Docker Deployment (Example)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Workers not processing
- Ensure Redis is running: `redis-cli ping`
- Check worker logs for errors
- Verify environment variables are set

### Entity enrichment failing
- Verify GOOGLE_API_KEY is set
- Check Knowledge Graph API quota
- Workers will skip enrichment if key is missing (non-blocking)

### Search returning no results
- Verify embeddings are being generated
- Check `embed` worker logs
- Ensure pgvector extension is installed

### Database connection issues
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure database exists and is accessible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run type checking: `npm run type-check`
5. Test your changes
6. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using TypeScript, Express, and Google AI
