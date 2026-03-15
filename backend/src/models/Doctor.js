import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  type: { type: String, enum: ['doctor', 'clinic'], default: 'doctor' },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

doctorSchema.index({ name: 1 });
doctorSchema.index({ user: 1 }, { unique: true, sparse: true });

export const Doctor = mongoose.model('Doctor', doctorSchema);
