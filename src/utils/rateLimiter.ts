import type { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';

export const rateLimiter = (limit: number, windowSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = `rate-limit:${ip}`;

    try {
      const requests = await redisClient.incr(key);
      
      if (requests === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      if (requests > limit) {
        return res.status(429).json({ message: 'Too many requests' });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error', error);
      next();
    }
  };
};
