import express from 'express';
import Feed from '../models/Feed.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const feed = await Feed.find({}).sort({ publishedAt: -1 }).limit(20);
    res.json({ feed });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch feed.' });
  }
});

export default router;
