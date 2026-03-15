import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  forRole: { type: String, required: true }, // 'receptionist', 'admin', etc.
  type: { type: String, default: 'info' },   // e.g. 'report_completed'
  title: { type: String, required: true },
  body: { type: String, default: '' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  readAt: { type: Date },
}, { timestamps: true });

notificationSchema.index({ forRole: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
