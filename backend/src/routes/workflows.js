import { Router } from 'express';
import { Order } from '../models/Order.js';

const router = Router();

router.get('/templates', async (req, res) => {
  const templates = [
    { id: '1', name: 'Standard histology', steps: ['Receive', 'Process', 'Embed', 'Cut', 'Stain', 'Review'] },
    { id: '2', name: 'Cytology', steps: ['Receive', 'Process', 'Screen', 'Review'] },
    { id: '3', name: 'Molecular', steps: ['Receive', 'Extract', 'Analyze', 'Report'] },
  ];
  res.json(templates);
});

router.get('/history', async (req, res) => {
  const { limit = 50, page = 1 } = req.query;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
  const [data, total] = await Promise.all([
    Order.find({ status: 'completed' }).populate('patient').sort({ completedAt: -1 }).skip(skip).limit(Math.min(100, parseInt(limit, 10))).lean(),
    Order.countDocuments({ status: 'completed' }),
  ]);
  res.json({ data, total, page: parseInt(page, 10), limit: Math.min(100, parseInt(limit, 10)) });
});

export default router;
