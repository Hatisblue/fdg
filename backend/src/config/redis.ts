import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('📦 Redis connected');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis ready');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
  }
})();

// Helper functions
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: string,
  ttl: number = 3600
): Promise<void> => {
  try {
    await redisClient.setEx(key, ttl, value);
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
  }
};

export const cacheFlush = async (): Promise<void> => {
  try {
    await redisClient.flushAll();
  } catch (error) {
    logger.error('Cache flush error:', error);
  }
};

export default redisClient;
