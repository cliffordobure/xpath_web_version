import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  testTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestType' }],
  status: {
    type: String,
    enum: [
      'draft', 'received', 'in_progress', 'assigned',
      'accessioned', 'grossed', 'processing', 'embedded', 'sectioned', 'stained',
      'review', 'completed', 'released', 'cancelled', 'archived',
    ],
    default: 'draft',
  },
  priority: { type: String, enum: ['normal', 'urgent', 'stat'], default: 'normal' },
  referringDoctor: { type: String, trim: true },
  referringDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedPathologist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedReceptionist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedAt: { type: Date },
  completedAt: { type: Date },
  notes: { type: String },
  reportSummary: { type: String }, // Patient-facing result summary (e.g. "Within normal limits")
  pathologistDiagnosis: { type: String, trim: true }, // Pathologist review and diagnosis (draft or final)
  reportLockedAt: { type: Date }, // When pathologist locked/signed off the report
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Courier / chain of custody
  courierStatus: {
    type: String,
    enum: ['', 'ready_for_pickup', 'on_way_to_pickup', 'at_site_for_pickup', 'picked_up_on_way_to_lab', 'in_transit', 'received_at_lab'],
    default: '',
  },
  courierCheckedInAt: { type: Date }, // When checked in for courier pickup
  courierReceivedAt: { type: Date },  // When received at lab
  assignedCourier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Courier user who claimed this pickup
  // Online order / pickup
  orderSource: { type: String, enum: ['walk_in', 'online', 'referral'], default: 'walk_in' },
  pickupAddress: { type: String, trim: true }, // Fallback or extra address text
  pickupPlaceName: { type: String, trim: true }, // Name/address from map search (e.g. "123 Main St, City")
  pickupLat: { type: Number }, // Latitude for courier navigation
  pickupLng: { type: Number }, // Longitude for courier navigation
}, { timestamps: true });

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ patient: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
