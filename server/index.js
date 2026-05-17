import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Try again later.' }
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Scan rate limit exceeded. Max 5 scans/minute.' }
});

app.use(globalLimiter);
app.use(express.json({ limit: '500kb' }));



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    startFeedCron();
    app.listen(process.env.PORT || 5000, () => {
      console.log(`[SERVER] Running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });
