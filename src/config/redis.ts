import { createClient } from 'redis';
import { env } from './env';
import { logger } from '../utils/logger';

const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection limit reached');
        return new Error('Redis reconnection limit exceeded');
      }
      return Math.min(retries * 100, 3000);
    },
    connectTimeout: 10000,
  },
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis client connected'));
redisClient.on('ready', () => logger.info('Redis client ready'));

(async () => {
  if (env.NODE_ENV !== 'test') {
    await redisClient.connect();
  }
})();

export default redisClient;
