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

