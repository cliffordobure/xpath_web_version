import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { SlideImage } from '../models/SlideImage.js';
import { Order } from '../models/Order.js';

const router = Router();

router.get('/by-order/:orderId', async (req, res) => {
  const images = await SlideImage.find({ order: req.params.orderId })
    .sort({ slideId: 1, uploadedAt: -1 })
    .lean();
  res.json(images);
});

router.post(
  '/',
  body('orderId').isMongoId(),
  body('slideId').trim().notEmpty(),
  body('imageUrl').trim().notEmpty(),
  body('scannerId').optional().trim(),
  body('label').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const order = await Order.findById(req.body.orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const image = await SlideImage.create({
      order: req.body.orderId,
      slideId: req.body.slideId,
      imageUrl: req.body.imageUrl,
      scannerId: req.body.scannerId,
      label: req.body.label,
    });
    res.status(201).json(image);
  }
);

export default router;
