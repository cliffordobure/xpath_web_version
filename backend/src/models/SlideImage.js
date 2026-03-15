import mongoose from 'mongoose';

const slideImageSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  slideId: { type: String, required: true, trim: true },
  imageUrl: { type: String, required: true, trim: true },
  scannerId: { type: String, trim: true },
  label: { type: String, trim: true },
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

slideImageSchema.index({ order: 1 });
slideImageSchema.index({ slideId: 1 });

export const SlideImage = mongoose.model('SlideImage', slideImageSchema);
