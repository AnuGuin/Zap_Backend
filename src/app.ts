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

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Global Rate Limiter (100 req / 1 min)
app.use(rateLimiter(100, 60));

// Routes
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/chat', chatRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
