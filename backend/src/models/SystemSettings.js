import mongoose from 'mongoose';

const DEFAULT_RECEPTIONIST_STEPS = ['receive', 'payment', 'courier', 'assign', 'results'];

const SUPPORTED_CURRENCIES = ['XAF', 'USD', 'EUR'];

const systemSettingsSchema = new mongoose.Schema({
  labName: { type: String, trim: true, default: 'X-PATH LIMS' },
  tagline: { type: String, trim: true, default: 'Reliable results. Clear pricing. Fast turnaround.' },
  aboutText: {
    type: String,
    trim: true,
    default: 'We are a pathology and molecular diagnostics laboratory committed to accurate diagnosis, transparent pricing, and timely reporting. Our team of pathologists and laboratory staff work with referring physicians and patients to deliver reliable results and secure, HIPAA-compliant reporting.',
  },
  contactEmail: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  contactAddress: { type: String, trim: true },
  businessHours: { type: String, trim: true, default: 'Mon–Fri 8:00–18:00; Sat 8:00–12:00' },
  accreditations: { type: [String], default: () => ['CAP', 'ISO 15189'] },
  privacyPolicyUrl: { type: String, trim: true },
  termsUrl: { type: String, trim: true },
  timezone: { type: String, trim: true, default: 'UTC' },
  dateFormat: { type: String, trim: true, default: 'YYYY-MM-DD' },
  currency: { type: String, enum: SUPPORTED_CURRENCIES, default: 'USD' },
  receptionistWorkflowSteps: {
    type: [String],
    default: () => DEFAULT_RECEPTIONIST_STEPS,
  },
}, { timestamps: true });

export { SUPPORTED_CURRENCIES };
export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
