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

const outdatedPackageSchema = new mongoose.Schema({
  name: String,
  current: String,
  latest: String,
updateType: { type: String, enum: ['major', 'minor', 'patch', 'unknown'] }}
, { _id: false });

const licenseSchema = new mongoose.Schema({
  name: String,
  license: String
}, { _id: false });

const scanSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  ecosystem: { type: String, required: true },
  manifestFile: { type: String, required: true },
  sourceType: { type: String, enum: ['paste', 'github'], default: 'paste' },
  githubRepo: String,
  totalDependencies: { type: Number, default: 0 },
  healthScore: { type: Number, min: 0, max: 100, default: 100 },
  grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
  vulnerabilities: [vulnerabilitySchema],
  outdatedPackages: [outdatedPackageSchema],
  licenses: [licenseSchema],
  scanDurationMs: Number,
  createdAt: { type: Date, default: Date.now }
});

scanSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Scan', scanSchema);
