import mongoose from 'mongoose';

const vulnerabilitySchema = new mongoose.Schema({
  packageName: String,
  installedVersion: String,
  fixedVersion: String,
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] },
  cveId: String,
  description: String,
  aliases: [String]
}, { _id: false });


