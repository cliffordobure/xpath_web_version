import mongoose from 'mongoose';

const ihcStainRecordSchema = new mongoose.Schema({
  slide: { type: mongoose.Schema.Types.ObjectId, ref: 'Slide', required: true },
  antibody: { type: String, trim: true, required: true },
  clone: { type: String, trim: true },
  dilution: { type: String, trim: true },
  antigenRetrieval: { type: String, trim: true },
  detectionMethod: { type: String, trim: true },
  counterstain: { type: String, trim: true },
  stainedAt: { type: Date, default: Date.now },
  stainedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qcStatus: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'rejected'],
    default: 'pending',
  },
  notes: { type: String, trim: true },
}, { timestamps: true });

ihcStainRecordSchema.index({ slide: 1 });
ihcStainRecordSchema.index({ antibody: 1 });

export const IHCStainRecord = mongoose.model('IHCStainRecord', ihcStainRecordSchema);
