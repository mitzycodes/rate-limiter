import { Router } from 'express';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Protect all API routes with rateLimiter middleware
router.use(rateLimiter);

router.get('/data', (req, res) => {
  const clientId = req.header('X-Client-Id') || req.ip;
  res.status(200).json({
    message: 'Request accepted',
    clientId,
    timestamp: new Date().toISOString(),
  });
});

export default router;
