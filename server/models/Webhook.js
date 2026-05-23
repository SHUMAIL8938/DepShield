import mongoose from 'mongoose';

const webhookSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  repoFullName: { type: String, required: true },
  manifestFile: { type: String, required: true },
  ecosystem: { type: String, required: true },
  secret: { type: String, required: true, select: false },
  active: { type: Boolean, default: true },
  lastTriggeredAt: Date,
  createdAt: { type: Date, default: Date.now },
  emailAlerts: { type: Boolean, default: true }
});

export default mongoose.model('Webhook', webhookSchema);
