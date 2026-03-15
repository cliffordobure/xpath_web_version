import { Router } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';

const router = Router();

/** List notifications for the current user's role (e.g. receptionist sees report-completed) */
router.get('/', async (req, res) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ message: 'Unauthorized' });
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const notifications = await Notification.find({ forRole: role })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json(notifications);
});

/** Mark a notification as read */
router.patch('/:id/read', async (req, res) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ message: 'Unauthorized' });
  const id = req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID' });
  const n = await Notification.findOneAndUpdate(
    { _id: id, forRole: role },
    { readAt: new Date() },
    { new: true }
  ).lean();
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json(n);
});

export default router;
