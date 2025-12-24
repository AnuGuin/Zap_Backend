import { createClient } from 'redis';
import { env } from './env';

const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  if (env.NODE_ENV !== 'test') {
    await redisClient.connect();
  }
})();

export default redisClient;
