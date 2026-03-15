import mongoose from 'mongoose';

const slideSchema = new mongoose.Schema({
  slideId: { type: String, required: true, unique: true },
  block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block', required: true },
  slideNumber: { type: Number, required: true },
  thickness: { type: String, trim: true },
  microtomeId: { type: String, trim: true },
  sectionedAt: { type: Date },
  sectionedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

slideSchema.index({ block: 1 });

export const Slide = mongoose.model('Slide', slideSchema);
