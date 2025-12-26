import fs from 'fs';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';

if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  try {
    const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
    const tempPath = path.resolve(process.cwd(), 'google-credentials.json');
    fs.writeFileSync(tempPath, credentials);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
    console.log('Google Cloud Credentials loaded from environment');
  } catch (error) {
    console.error('Failed to load Google Credentials:', error);
  }
}

import app from './app';
import { env } from './config/env';
import { setupSpacesSocket } from './modules/spaces/spaces.socket';
import { logger } from './utils/logger';
import './events/events';
import './workers'; // Initialize all workers

const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173"
].filter(Boolean) as string[];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

setupSpacesSocket(io);

server.listen(env.PORT, () => {
  logger.info(`Zapnote Backend running on port ${env.PORT}`);
});