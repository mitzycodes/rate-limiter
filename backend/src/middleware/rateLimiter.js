import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import redis from '../config/db.js';
import { logRequest } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the Lua script once on startup
const luaScriptPath = path.resolve(__dirname, '../scripts/tokenBucket.lua');
const tokenBucketScript = fs.readFileSync(luaScriptPath, 'utf8');

/**
 * Token Bucket Rate Limiter Express Middleware.
 */
export async function rateLimiter(req, res, next) {
  const capacity = Number(process.env.BUCKET_CAPACITY) || 10;
  const refillRate = Number(process.env.REFILL_RATE) || 0.5;

  // Identify client via X-Client-Id header or IP address
  const clientId = req.header('X-Client-Id') || req.ip || 'anonymous';
  const redisKey = `rate_limit:${clientId}`;
  const requestPath = req.originalUrl || req.path;

  try {
    if (redis.status !== 'ready') {
      throw new Error(`Redis client is not ready (current status: ${redis.status})`);
    }

    const result = await redis.eval(
      tokenBucketScript,
      1,
      redisKey,
      capacity,
      refillRate,
      Date.now(),
      1
    );

    const [allowed, remaining, retryAfter] = result;

    // Always set response headers
    res.setHeader('X-RateLimit-Limit', capacity);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('Retry-After', retryAfter);

    if (allowed === 0) {
      logRequest({
        clientId,
        status: 429,
        remaining,
        path: requestPath,
      });

      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter,
        clientId,
      });
    }

    logRequest({
      clientId,
      status: 200,
      remaining,
      path: requestPath,
    });

    return next();
  } catch (error) {
    // If Redis is unreachable, fail open (call next()) and log the Redis error
    console.error('[RateLimiter] Redis error:', error.message || error);

    res.setHeader('X-RateLimit-Limit', capacity);
    res.setHeader('X-RateLimit-Remaining', capacity);
    res.setHeader('Retry-After', 0);

    return next();
  }
}

export default rateLimiter;
