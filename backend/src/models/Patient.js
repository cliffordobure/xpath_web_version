import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  address: { type: String, trim: true },
  nationalId: { type: String, trim: true },
  referringDoctor: { type: String, trim: true },
  notes: { type: String },
}, { timestamps: true });

patientSchema.index({ lastName: 1, firstName: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ nationalId: 1 });

export const Patient = mongoose.model('Patient', patientSchema);
