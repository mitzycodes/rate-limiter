import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');

export const redis = new Redis(redisUrl, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  ...(isTls && { tls: {} }),
  retryStrategy(times) {
    // Reconnect with exponential backoff capped at 2 seconds
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('[Redis] Connecting to Redis server...');
});

redis.on('ready', () => {
  console.log('[Redis] Connection established and ready to accept commands.');
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('close', () => {
  console.warn('[Redis] Connection closed.');
});

redis.on('reconnecting', (time) => {
  console.log(`[Redis] Reconnecting in ${time}ms...`);
});

/**
 * Checks Redis connectivity and health.
 * @returns {Promise<{ status: string, response?: string, error?: string, timestamp: string }>}
 */
export async function checkRedisHealth() {
  try {
    const pong = await redis.ping();
    return {
      status: pong === 'PONG' ? 'healthy' : 'degraded',
      response: pong,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export default redis;
