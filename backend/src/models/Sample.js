import mongoose from 'mongoose';

const sampleSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  label: { type: String, required: true, trim: true },
  type: { type: String, trim: true },
  status: { type: String, enum: ['collected', 'received', 'processing', 'completed'], default: 'collected' },
  receivedAt: { type: Date },
  location: { type: String, trim: true },
  notes: { type: String },
}, { timestamps: true });

sampleSchema.index({ order: 1 });
sampleSchema.index({ label: 1 });

export const Sample = mongoose.model('Sample', sampleSchema);
