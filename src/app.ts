import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimiter } from './utils/rateLimiter';
import knowledgeRoutes from './modules/knowledge/knowledge.routes';
import searchRoutes from './modules/search/search.routes';
import spacesRoutes from './modules/spaces/spaces.routes';
import chatRoutes from './modules/chat/chat.routes';

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,       // Your Vercel App
  "http://localhost:3000",        // Local React/Next.js
  "http://localhost:5173"         // Local Vite
].filter(Boolean) as string[];

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(morgan('dev'));

// Health Check 
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Global Rate Limiter 
app.use(rateLimiter(50, 60));

// Routes
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/chat', chatRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  });
});

export default app;