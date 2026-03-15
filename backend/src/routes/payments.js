import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';

const router = Router();

/** Summary of completed payments: total revenue and count (for dashboard) */
router.get('/summary', async (req, res) => {
  try {
    const [result] = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalPaid: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    res.json({
      totalPaid: result?.totalPaid ?? 0,
      paidCount: result?.count ?? 0,
    });
  } catch (err) {
    console.error('Payments summary error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to get payment summary' });
  }
});

router.get('/', async (req, res) => {
  const { orderId, status, limit = 50, page = 1 } = req.query;
  const filter = {};
  if (orderId) filter.order = orderId;
  if (status) filter.status = status;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
  const [data, total] = await Promise.all([
    Payment.find(filter).populate({ path: 'order', populate: { path: 'patient' } }).populate('createdBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(Math.min(100, parseInt(limit, 10))).lean(),
    Payment.countDocuments(filter),
  ]);
  res.json({ data, total, page: parseInt(page, 10), limit: Math.min(100, parseInt(limit, 10)) });
});

router.post(
  '/',
  body('order').isMongoId(),
  body('amount').isFloat({ min: 0 }),
  body('method').optional().isIn(['cash', 'card', 'insurance', 'transfer', 'other', 'mtn_mobile_money', 'orange_money']),
  body('reference').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const payment = await Payment.create({
      order: req.body.order,
      amount: req.body.amount,
      method: req.body.method || 'cash',
      reference: req.body.reference,
      createdBy: req.user._id,
      status: 'completed',
    });
    await applyPaymentCompletedOrderUpdate(req.body.order);
    const populated = await Payment.findById(payment._id).populate({ path: 'order', populate: { path: 'patient' } }).populate('createdBy', 'name email').lean();
    res.status(201).json(populated);
  }
);

async function applyPaymentCompletedOrderUpdate(orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order) return;
  const isReferral = !!(order.referringDoctor && String(order.referringDoctor).trim());
  if (isReferral) {
    await Order.findByIdAndUpdate(orderId, {
      courierStatus: 'ready_for_pickup',
      courierCheckedInAt: new Date(),
    });
  } else {
    await Order.findByIdAndUpdate(orderId, {
      status: 'received',
      receivedAt: new Date(),
    });
  }
}

router.patch(
  '/:id',
  body('status').optional().isIn(['pending', 'completed', 'refunded', 'failed']),
  body('patientConfirmed').optional().isBoolean(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const updates = {};
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.patientConfirmed === true) updates.patientConfirmedAt = new Date();
    const payment = await Payment.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate({ path: 'order', populate: { path: 'patient' } })
      .populate('createdBy', 'name email')
      .lean();
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (req.body.status === 'completed' && payment.order) {
      const orderId = typeof payment.order === 'object' ? payment.order._id : payment.order;
      await applyPaymentCompletedOrderUpdate(orderId);
    }
    res.json(payment);
  }
);

export default router;
