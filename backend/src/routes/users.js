import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();
const ROLES = ['receptionist', 'technician', 'pathologist', 'admin', 'finance', 'courier', 'doctor'];

router.get('/me', (req, res) => {
  res.json(req.user);
});

/** Update current user's own profile (name and/or password). All roles. */
router.patch(
  '/me',
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('currentPassword').optional().trim(),
  body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    const { name, currentPassword, newPassword } = req.body;
    if (newPassword !== undefined && (!currentPassword || !currentPassword.trim())) {
      return res.status(400).json({ message: 'Current password is required to set a new password' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name !== undefined) user.name = name.trim();
    if (newPassword !== undefined && newPassword.trim()) {
      const match = await user.comparePassword(currentPassword);
      if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
      user.password = newPassword.trim();
    }
    await user.save();
    const u = await User.findById(user._id).select('-password').lean();
    res.json(u);
  }
);

router.get('/', roleMiddleware('admin', 'receptionist', 'technician'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) {
    console.error('Users list error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to list users' });
  }
});

router.get('/:id', roleMiddleware('admin'), async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.post(
  '/',
  roleMiddleware('admin'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty(),
  body('role').isIn(ROLES),
  body('active').optional().isBoolean(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    const { email, password, name, role, active } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({
      email,
      password: password || 'changeme123',
      name,
      role: role || 'receptionist',
      active: active !== false,
    });
    const u = await User.findById(user._id).select('-password').lean();
    return res.status(201).json(u);
  }
);

router.patch(
  '/:id',
  roleMiddleware('admin'),
  body('name').optional().trim().notEmpty(),
  body('role').optional().isIn(ROLES),
  body('active').optional().isBoolean(),
  body('password').optional().isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    const { name, role, active, password } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (password !== undefined) updates.password = password;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (Object.keys(updates).length) {
      if (updates.password) user.password = updates.password;
      if (updates.name) user.name = updates.name;
      if (updates.role !== undefined) user.role = updates.role;
      if (updates.active !== undefined) user.active = updates.active;
      await user.save();
    }
    const u = await User.findById(user._id).select('-password').lean();
    return res.json(u);
  }
);

export default router;
