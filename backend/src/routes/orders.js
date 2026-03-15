import mongoose from 'mongoose';
import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { Order } from '../models/Order.js';
import { Patient } from '../models/Patient.js';
import { Notification } from '../models/Notification.js';
import { Payment } from '../models/Payment.js';

const router = Router();

const isValidId = (id) => id && mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;

const statuses = [
  'draft', 'received', 'in_progress', 'assigned',
  'accessioned', 'grossed', 'processing', 'embedded', 'sectioned', 'stained',
  'review', 'completed', 'released', 'cancelled', 'archived',
];

/** Statuses that are valid before an order can move to pathologist review (payment must be confirmed first) */
const statusesAllowedBeforeReview = ['received', 'in_progress', 'assigned', 'accessioned', 'grossed', 'processing', 'embedded', 'sectioned', 'stained'];

router.get('/', async (req, res) => {
  const { status, search, limit = 50, page = 1, courierStatus, assignedToMe, assignedToMePathologist, assignedToMeCourier, pickupRequests } = req.query;
  const filter = {};
  if (status && statuses.includes(status)) filter.status = status;
  if (assignedToMe === 'true' && req.user) filter.assignedTechnician = req.user._id;
  if (assignedToMePathologist === 'true' && req.user) filter.assignedPathologist = req.user._id;
  if (assignedToMeCourier === 'true' && req.user) filter.assignedCourier = req.user._id;
  const isAdmin = req.user?.role === 'admin';
  // Receptionists see all orders (so they can assign and process them)
  // Pathologists see only orders assigned to them (admin sees all)
  if (!isAdmin && req.user?.role === 'pathologist' && req.user?._id) filter.assignedPathologist = req.user._id;
  // Admin acting as technician: show all orders in technician pipeline (any assigned technician)
  if (isAdmin && req.query.workflow === 'technician') {
    filter.status = { $in: ['received', 'assigned', 'accessioned', 'grossed', 'processing', 'embedded', 'sectioned', 'stained', 'review'] };
    delete filter.assignedTechnician; // in case assignedToMe was sent
  }
  // Admin acting as pathologist: show all orders in review
  if (isAdmin && req.query.workflow === 'pathologist') {
    filter.status = 'review';
    delete filter.assignedPathologist;
  }
  if (pickupRequests === 'true') {
    filter.courierStatus = 'ready_for_pickup';
    filter.assignedCourier = null;
    filter.orderSource = 'online'; // only online orders that need pickup
  }
  if (courierStatus) {
    const statusList = String(courierStatus).split(',').map(s => s.trim()).filter(Boolean);
    const valid = ['ready_for_pickup', 'on_way_to_pickup', 'at_site_for_pickup', 'picked_up_on_way_to_lab', 'in_transit', 'received_at_lab'];
    const match = statusList.filter(s => valid.includes(s));
    if (match.length === 1) filter.courierStatus = match[0];
    else if (match.length > 1) filter.courierStatus = { $in: match };
  }
  // Courier role: only see (1) unassigned online pickup requests or (2) orders assigned to them
  if (req.user?.role === 'courier' && assignedToMeCourier !== 'true' && pickupRequests !== 'true') {
    filter.$or = [
      { assignedCourier: req.user._id },
      { courierStatus: 'ready_for_pickup', assignedCourier: null, orderSource: 'online' },
    ];
  }
  if (search) {
    const patients = await Patient.find({
      $or: [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ],
    }).select('_id');
    filter.$or = [
      { orderNumber: new RegExp(search, 'i') },
      { patient: { $in: patients.map(p => p._id) } },
    ];
  }
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('patient').populate('testTypes').populate('referringDoctorId', 'name code type').populate('assignedTechnician', 'name email role').populate('assignedPathologist', 'name email role').populate('assignedReceptionist', 'name email role').populate('assignedCourier', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(Math.min(100, parseInt(limit, 10))).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ data: orders, total, page: parseInt(page, 10), limit: Math.min(100, parseInt(limit, 10)) });
});

/** Admin: counts for all orders (no filter) so dashboard total and breakdown agree */
router.get('/counts', async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const [total, byStatus] = await Promise.all([
    Order.countDocuments({}),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const byStatusMap = {};
  for (const s of statuses) byStatusMap[s] = 0;
  for (const { _id, count } of byStatus) byStatusMap[_id] = count;
  res.json({ total, byStatus: byStatusMap });
});

router.get('/by-number/:orderNumber', async (req, res) => {
  const orderNumber = req.params.orderNumber?.trim();
  if (!orderNumber) return res.status(400).json({ message: 'Order number required' });
  const order = await Order.findOne({ orderNumber: new RegExp(`^${orderNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
    .populate('patient').populate('testTypes').populate('referringDoctorId', 'name code type').populate('assignedTechnician', 'name email role').populate('assignedPathologist', 'name email role').populate('assignedReceptionist', 'name email role').populate('assignedCourier', 'name email role').lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (req.user?.role === 'pathologist' && req.user?._id && String(order.assignedPathologist) !== String(req.user._id)) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});

router.get('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
  const order = await Order.findById(req.params.id).populate('patient').populate('testTypes').populate('referringDoctorId', 'name code type').populate('assignedTechnician', 'name email role').populate('assignedPathologist', 'name email role').populate('assignedReceptionist', 'name email role').populate('assignedCourier', 'name email role').lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  // Receptionists can view any order (to assign themselves and process)
  // Pathologists can only view orders assigned to them
  if (req.user?.role === 'pathologist' && req.user?._id) {
    if (String(order.assignedPathologist) !== String(req.user._id)) return res.status(404).json({ message: 'Order not found' });
  }
  res.json(order);
});

router.post(
  '/',
  body('patient').isMongoId(),
  body('testTypes').optional().isArray(),
  body('testTypes.*').optional().isMongoId(),
  body('priority').optional().isIn(['normal', 'urgent', 'stat']),
  body('referringDoctor').optional().trim(),
  body('referringDoctorId').optional().isMongoId(),
  body('notes').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    try {
      const count = await Order.countDocuments();
      const orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
      const order = await Order.create({
        orderNumber,
        patient: req.body.patient,
        testTypes: req.body.testTypes || [],
        priority: req.body.priority || 'normal',
        referringDoctor: req.body.referringDoctor,
        referringDoctorId: req.body.referringDoctorId || undefined,
        notes: req.body.notes,
        ...(req.user && req.user._id ? { createdBy: req.user._id } : {}),
      });
      const populated = await Order.findById(order._id).populate('patient').populate('testTypes').lean();
      res.status(201).json(populated);
    } catch (err) {
      console.error('Order create error:', err.message);
      res.status(500).json({ message: err.message || 'Failed to create order' });
    }
  }
);

router.patch('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
  const allowed = ['patient', 'testTypes', 'status', 'priority', 'referringDoctor', 'referringDoctorId', 'assignedTechnician', 'assignedPathologist', 'assignedReceptionist', 'assignedCourier', 'receivedAt', 'completedAt', 'notes', 'reportSummary', 'pathologistDiagnosis', 'reportLockedAt', 'courierStatus', 'courierCheckedInAt', 'courierReceivedAt'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  if (req.body.patient !== undefined && !isValidId(req.body.patient)) delete updates.patient;
  if (req.body.testTypes !== undefined) {
    updates.testTypes = Array.isArray(req.body.testTypes) ? req.body.testTypes.filter((id) => isValidId(id)) : [];
  }
  if (req.body.assignedCourier !== undefined && req.user?.role !== 'admin' && req.user?.role !== 'courier' && req.user?.role !== 'receptionist') delete updates.assignedCourier;
  if (req.body.courierStatus === 'ready_for_pickup' && updates.courierStatus) updates.courierCheckedInAt = new Date();
  if (req.body.courierStatus === 'received_at_lab' && updates.courierStatus) {
    updates.courierReceivedAt = new Date();
    if (!updates.status) updates.status = 'received';
  }
  if (req.body.reportLockedAt !== undefined && req.body.reportLockedAt) {
    updates.reportLockedAt = new Date();
    if (!updates.status) updates.status = 'completed';
    if (!updates.completedAt) updates.completedAt = new Date();
  }

  // Strict workflow: cannot assign pathologist or move to review until payment is confirmed
  const assigningPathologist = updates.assignedPathologist !== undefined;
  const movingToReview = updates.status === 'review';
  if (assigningPathologist || movingToReview) {
    const currentOrder = await Order.findById(req.params.id).select('status').lean();
    if (!currentOrder) return res.status(404).json({ message: 'Order not found' });
    const hasCompletedPayment = await Payment.exists({ order: req.params.id, status: 'completed' });
    if (!hasCompletedPayment) {
      return res.status(400).json({
        message: 'Payment must be confirmed before assigning a pathologist or moving the order to review. Confirm payment in the receptionist workflow first.',
      });
    }
    if (movingToReview && !statusesAllowedBeforeReview.includes(currentOrder.status)) {
      return res.status(400).json({
        message: `Order cannot move to pathologist review from status "${currentOrder.status}". Workflow must progress through receive → payment → technician steps (e.g. stained) before review.`,
      });
    }
  }

  const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('patient').populate('testTypes').populate('referringDoctorId', 'name code type').populate('assignedTechnician', 'name email role').populate('assignedPathologist', 'name email role').populate('assignedReceptionist', 'name email role').populate('assignedCourier', 'name email role').lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (updates.reportLockedAt) {
    await Notification.create({
      forRole: 'receptionist',
      type: 'report_completed',
      title: 'Report completed',
      body: `Report for order ${order.orderNumber || order._id} has been completed by the pathologist and is ready to share.`,
      orderId: order._id,
    });
  }
  res.json(order);
});

export default router;
