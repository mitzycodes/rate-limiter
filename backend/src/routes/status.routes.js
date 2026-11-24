import { Router } from 'express';
import redis, { checkRedisHealth } from '../config/db.js';

const router = Router();

/**
 * Health check route verifying Redis connectivity.
 */
router.get('/health', async (req, res) => {
  const health = await checkRedisHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Debug route scanning all rate_limit:* keys and returning their state.
 */
router.get('/keys', async (req, res) => {
  try {
    let cursor = '0';
    const keys = [];

    do {
      const [nextCursor, matchedKeys] = await redis.scan(
        cursor,
        'MATCH',
        'rate_limit:*',
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    if (keys.length === 0) {
      return res.status(200).json([]);
    }

    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.hgetall(key);
      pipeline.ttl(key);
    }

    const responses = await pipeline.exec();
    const results = keys.map((key, index) => {
      const [, hashData] = responses[index * 2];
      const [, ttl] = responses[index * 2 + 1];

      return {
        key,
        tokens: hashData && hashData.tokens !== undefined ? parseFloat(hashData.tokens) : null,
        last_refill: hashData && hashData.last_refill !== undefined ? Number(hashData.last_refill) : null,
        ttl,
      };
    });

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
