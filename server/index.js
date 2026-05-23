import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';
import scanRoutes from './routes/scan.js';
import webhookRoutes from './routes/webhook.js';
import feedRoutes from './routes/feed.js';
import { startFeedCron } from './services/feedCron.js';


const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  validate: { xForwardedForHeader: false },
  message: { error: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Try again later.' }
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  validate: { xForwardedForHeader: false },
  message: { error: 'TOO_MANY_REQUESTS', message: 'Scan rate limit exceeded. Max 5 scans/minute.' }
});

app.use(globalLimiter);
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook/github') return next();
  express.json({ limit: '500kb' })(req, res, next);
});
app.use(clerkMiddleware());

app.use('/api/scan', scanLimiter, scanRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/feed', feedRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    startFeedCron();
    app.listen(PORT, '0.0.0.0', ()  => {
      console.log(`[SERVER] Running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });
