import mongoose from 'mongoose';

const feedSchema = new mongoose.Schema({
  packageName: { type: String, required: true },
  ecosystem: { type: String, required: true },
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] },
  cveId: String,
  summary: String,
  publishedAt: Date,
  fetchedAt: { type: Date, default: Date.now }
});

feedSchema.index({ fetchedAt: -1 });

export default mongoose.model('Feed', feedSchema);
