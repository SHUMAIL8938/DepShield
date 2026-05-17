import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
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

