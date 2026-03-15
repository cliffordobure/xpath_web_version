import mongoose from 'mongoose';

const cytologyCaseSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  caseId: { type: String, required: true, unique: true, trim: true },
  specimenType: { type: String, trim: true },
  receivedAt: { type: Date },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processingMethod: { type: String, trim: true },
  processingAt: { type: Date },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stainType: { type: String, trim: true },
  stainedAt: { type: Date },
  stainedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  screeningStatus: {
    type: String,
    enum: ['pending', 'screened', 'in_review', 'completed'],
    default: 'pending',
  },
  screenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  screenedAt: { type: Date },
  notes: { type: String, trim: true },
}, { timestamps: true });

cytologyCaseSchema.index({ order: 1 });
cytologyCaseSchema.index({ caseId: 1 });
cytologyCaseSchema.index({ screeningStatus: 1 });

export const CytologyCase = mongoose.model('CytologyCase', cytologyCaseSchema);
