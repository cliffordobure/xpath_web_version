import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

/** Current doctor profile (role doctor) - must be before /:id */
router.get('/me/profile', roleMiddleware('doctor'), async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id }).populate('user', 'email name').lean();
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found. Ask admin to link your user to a doctor record.' });
  res.json(doctor);
});

/** Referral statistics for current doctor (role doctor) */
router.get('/me/stats', roleMiddleware('doctor'), async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  const orders = await Order.find({ referringDoctorId: doctor._id })
    .populate('patient', 'firstName lastName')
    .populate('testTypes', 'code name price')
    .sort({ createdAt: -1 })
    .lean();
  const orderIds = orders.map((o) => o._id);
  const payments = await Payment.find({ order: { $in: orderIds }, status: 'completed' }).lean();
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const byMonth = {};
  orders.forEach((o) => {
    const d = o.createdAt ? new Date(o.createdAt) : new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] || 0) + 1;
  });
  const byMonthList = Object.entries(byMonth)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);
  res.json({
    doctor: { _id: doctor._id, name: doctor.name, type: doctor.type },
    totalReferrals: orders.length,
    totalRevenue,
    byMonth: byMonthList,
    recentOrders: orders.slice(0, 50),
  });
});

/** List all doctors (admin) */
router.get('/', roleMiddleware('admin'), async (req, res) => {
  const list = await Doctor.find().populate('user', 'email name').sort({ name: 1 }).lean();
  res.json(list);
});

/** Get one doctor (admin) */
router.get('/:id', roleMiddleware('admin'), async (req, res) => {
  const doc = await Doctor.findById(req.params.id).populate('user', 'email name').lean();
  if (!doc) return res.status(404).json({ message: 'Doctor not found' });
  res.json(doc);
});

/** Create doctor (admin). Optionally create and link a portal user. */
router.post(
  '/',
  roleMiddleware('admin'),
  body('name').trim().notEmpty(),
  body('code').optional().trim(),
  body('type').optional().isIn(['doctor', 'clinic']),
  body('email').optional().trim().isEmail(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('createUser').optional().isBoolean(),
  body('userEmail').optional().trim().isEmail(),
  body('userPassword').optional().isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    const { name, code, type, email, phone, address, createUser, userEmail, userPassword } = req.body;
    const doctor = await Doctor.create({
      name: name.trim(),
      code: code?.trim() || undefined,
      type: type || 'doctor',
      email: email?.trim()?.toLowerCase() || undefined,
      phone: phone?.trim() || undefined,
      address: address?.trim() || undefined,
    });
    if (createUser && userEmail?.trim() && userPassword) {
      const existing = await User.findOne({ email: userEmail.trim().toLowerCase() });
      if (existing) return res.status(400).json({ message: 'That email is already used by another user' });
      const user = await User.create({
        email: userEmail.trim().toLowerCase(),
        password: userPassword,
        name: name.trim(),
        role: 'doctor',
      });
      doctor.user = user._id;
      await doctor.save();
    }
    const populated = await Doctor.findById(doctor._id).populate('user', 'email name').lean();
    res.status(201).json(populated);
  }
);

/** Update doctor (admin) */
router.patch(
  '/:id',
  roleMiddleware('admin'),
  body('name').optional().trim().notEmpty(),
  body('code').optional().trim(),
  body('type').optional().isIn(['doctor', 'clinic']),
  body('email').optional().trim().isEmail(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('active').optional().isBoolean(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    const updates = ['name', 'code', 'type', 'email', 'phone', 'address', 'active'];
    updates.forEach((f) => { if (req.body[f] !== undefined) doctor[f] = req.body[f]; });
    await doctor.save();
    const populated = await Doctor.findById(doctor._id).populate('user', 'email name').lean();
    res.json(populated);
  }
);

/** Link existing user to doctor (admin). User must have role doctor. */
router.post(
  '/:id/link-user',
  roleMiddleware('admin'),
  body('userId').isMongoId(),
  async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    const user = await User.findById(req.body.userId).select('role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'doctor') return res.status(400).json({ message: 'User must have role doctor' });
    const already = await Doctor.findOne({ user: user._id });
    if (already && String(already._id) !== String(doctor._id)) return res.status(400).json({ message: 'That user is already linked to another doctor' });
    doctor.user = user._id;
    await doctor.save();
    const populated = await Doctor.findById(doctor._id).populate('user', 'email name').lean();
    res.json(populated);
  }
);

export default router;
