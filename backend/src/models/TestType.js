import mongoose from 'mongoose';

const testTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  price: { type: Number, default: 0 },
  category: { type: String, trim: true },
  /** Typical turnaround in hours (e.g. 24, 48). Optional; used for display on public pricing. */
  turnaroundHours: { type: Number, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const TestType = mongoose.model('TestType', testTypeSchema);
