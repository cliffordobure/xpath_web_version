import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  method: {
    type: String,
    enum: ['cash', 'card', 'insurance', 'transfer', 'other', 'mtn_mobile_money', 'orange_money'],
    default: 'cash',
  },
  status: { type: String, enum: ['pending', 'completed', 'refunded', 'failed'], default: 'pending' },
  reference: { type: String, trim: true },
  paidAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientConfirmedAt: { type: Date }, // When admin confirmed payment details with patient
}, { timestamps: true });

export const Payment = mongoose.model('Payment', paymentSchema);
