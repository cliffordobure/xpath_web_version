import mongoose from 'mongoose';

const stainingRecordSchema = new mongoose.Schema({
  slide: { type: mongoose.Schema.Types.ObjectId, ref: 'Slide', required: true },
  stainType: { type: String, trim: true, default: 'H&E' },
  stainedAt: { type: Date, default: Date.now },
  stainedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qcStatus: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

stainingRecordSchema.index({ slide: 1 });

export const StainingRecord = mongoose.model('StainingRecord', stainingRecordSchema);
