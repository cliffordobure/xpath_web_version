import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Sample } from '../models/Sample.js';

const router = Router();

router.get('/', async (req, res) => {
  const { orderId, status, limit = 100, page = 1 } = req.query;
  const filter = {};
  if (orderId) filter.order = orderId;
  if (status) filter.status = status;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
  const [data, total] = await Promise.all([
    Sample.find(filter).populate('order').sort({ createdAt: -1 }).skip(skip).limit(Math.min(100, parseInt(limit, 10))).lean(),
    Sample.countDocuments(filter),
  ]);
  res.json({ data, total, page: parseInt(page, 10), limit: Math.min(100, parseInt(limit, 10)) });
});

router.get('/:id', async (req, res) => {
  const sample = await Sample.findById(req.params.id).populate('order').lean();
  if (!sample) return res.status(404).json({ message: 'Sample not found' });
  res.json(sample);
});

router.post(
  '/',
  body('order').isMongoId(),
  body('label').trim().notEmpty(),
  body('type').optional().trim(),
  body('status').optional().isIn(['collected', 'received', 'processing', 'completed']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const sample = await Sample.create({
      ...req.body,
      receivedAt: req.body.status === 'received' ? new Date() : undefined,
    });
    const populated = await Sample.findById(sample._id).populate('order').lean();
    res.status(201).json(populated);
  }
);

router.patch('/:id', async (req, res) => {
  const allowed = ['label', 'type', 'status', 'location', 'notes'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  if (req.body.status === 'received' && !updates.receivedAt) updates.receivedAt = new Date();
  const sample = await Sample.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('order').lean();
  if (!sample) return res.status(404).json({ message: 'Sample not found' });
  res.json(sample);
});

export default router;
