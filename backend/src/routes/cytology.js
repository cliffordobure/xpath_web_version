import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { CytologyCase } from '../models/CytologyCase.js';
import { Order } from '../models/Order.js';

const router = Router();

/** List cytology cases; optional filters: orderId, screeningStatus */
router.get('/cases', async (req, res) => {
  const { orderId, screeningStatus, limit = 50 } = req.query;
  const filter = {};
  if (orderId) filter.order = orderId;
  if (screeningStatus) filter.screeningStatus = screeningStatus;
  const cases = await CytologyCase.find(filter)
    .populate('order')
    .populate({ path: 'order', populate: ['patient', 'testTypes'] })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
  res.json(cases);
});

/** Get one cytology case by ID or caseId */
router.get('/cases/:id', async (req, res) => {
  const id = req.params.id.trim();
  const isMongoId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
  let doc;
  if (isMongoId) {
    doc = await CytologyCase.findById(id).populate('order').populate({ path: 'order', populate: ['patient', 'testTypes'] }).lean();
  } else {
    doc = await CytologyCase.findOne({ caseId: new RegExp(`^${id}$`, 'i') })
      .populate('order')
      .populate({ path: 'order', populate: ['patient', 'testTypes'] })
      .lean();
  }
  if (!doc) return res.status(404).json({ message: 'Cytology case not found' });
  res.json(doc);
});

/** Create a cytology case from an order */
router.post(
  '/cases',
  body('orderId').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const order = await Order.findById(req.body.orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const existing = await CytologyCase.findOne({ order: order._id }).lean();
    if (existing) return res.status(400).json({ message: 'A cytology case already exists for this order', caseId: existing.caseId });
    const count = await CytologyCase.countDocuments();
    const caseId = `CYT-${String(count + 1).padStart(6, '0')}`;
    const doc = await CytologyCase.create({
      order: order._id,
      caseId,
    });
    const populated = await CytologyCase.findById(doc._id).populate('order').populate({ path: 'order', populate: ['patient', 'testTypes'] }).lean();
    res.status(201).json(populated);
  }
);

/** Update cytology case: receive, process, stain, or screen */
router.patch(
  '/cases/:id',
  body('specimenType').optional().trim(),
  body('processingMethod').optional().trim(),
  body('stainType').optional().trim(),
  body('screeningStatus').optional().isIn(['pending', 'screened', 'in_review', 'completed']),
  body('notes').optional().trim(),
  body('received').optional().isBoolean(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const doc = await CytologyCase.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Cytology case not found' });
    const body = req.body || {};
    if (body.specimenType !== undefined) doc.specimenType = body.specimenType;
    if (body.notes !== undefined) doc.notes = body.notes;
    if (body.processingMethod !== undefined) {
      doc.processingMethod = body.processingMethod;
      doc.processingAt = new Date();
      doc.processedBy = req.user._id;
    }
    if (body.stainType !== undefined) {
      doc.stainType = body.stainType;
      doc.stainedAt = new Date();
      doc.stainedBy = req.user._id;
    }
    if (body.screeningStatus !== undefined) {
      doc.screeningStatus = body.screeningStatus;
      doc.screenedAt = new Date();
      doc.screenedBy = req.user._id;
    }
    if (body.received !== undefined && body.received) {
      doc.receivedAt = doc.receivedAt || new Date();
      doc.receivedBy = doc.receivedBy || req.user._id;
    }
    await doc.save();
    const populated = await CytologyCase.findById(doc._id).populate('order').populate({ path: 'order', populate: ['patient', 'testTypes'] }).lean();
    res.json(populated);
  }
);

export default router;
