import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { env } from './config/env';
import { setupSpacesSocket } from './modules/spaces/spaces.socket';
import { logger } from './utils/logger';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST'],
  },
});

setupSpacesSocket(io);

server.listen(env.PORT, () => {
  logger.info(`Zapnote Backend running on port ${env.PORT}`);
});

