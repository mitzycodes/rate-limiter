import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes.js';
import statusRoutes from './routes/status.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust the first proxy hop so req.ip resolves the real client IP behind Render's reverse proxy
app.set('trust proxy', 1);

// Configure CORS to allow FRONTEND_URL (fallback to '*' if unset)
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(
  cors({
    origin: allowedOrigin,
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  })
);

// Body parsing
app.use(express.json());

// Root health/info route
app.get('/', (req, res) => {
  res.json({
    service: 'Token Bucket Rate Limiter API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/status/health',
      keys:   '/status/keys',
      data:   '/api/data',
    },
  });
});

// Mount routes
app.use('/api', apiRoutes);
app.use('/status', statusRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, server };
export default app;
