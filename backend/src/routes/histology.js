import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Accession } from '../models/Accession.js';
import { Block } from '../models/Block.js';
import { Slide } from '../models/Slide.js';
import { Order } from '../models/Order.js';
import { ProcessingRecord } from '../models/ProcessingRecord.js';
import { StainingRecord } from '../models/StainingRecord.js';

const router = Router();

function escapeRegex(s) {
  return String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/accession/:accessionId', async (req, res) => {
  const id = escapeRegex(req.params.accessionId);
  if (!id) return res.status(400).json({ message: 'Accession ID is required' });
  const accession = await Accession.findOne({ accessionId: new RegExp(`^${id}$`, 'i') })
    .populate('order')
    .populate({ path: 'order', populate: ['patient', 'testTypes'] })
    .lean();
  if (!accession) return res.status(404).json({ message: 'Accession not found' });
  const blocks = await Block.find({ accession: accession._id }).lean();
  const slides = await Slide.find({ block: { $in: blocks.map((b) => b._id) } })
    .populate('block')
    .lean();
  res.json({ accession, blocks, slides });
});

router.get('/blocks/:accessionId', async (req, res) => {
  const id = escapeRegex(req.params.accessionId);
  if (!id) return res.status(400).json({ message: 'Accession ID is required' });
  const accession = await Accession.findOne({ accessionId: new RegExp(`^${id}$`, 'i') }).lean();
  if (!accession) return res.status(404).json({ message: 'Accession not found' });
  const blocks = await Block.find({ accession: accession._id }).lean();
  res.json(blocks);
});

router.post(
  '/grossing',
  body('accessionId').trim().notEmpty(),
  body('grossDescription').trim().notEmpty(),
  body('numberOfBlocks').optional().isInt({ min: 1 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const accId = escapeRegex(req.body.accessionId);
    const accession = await Accession.findOne({ accessionId: new RegExp(`^${accId}$`, 'i') });
    if (!accession) return res.status(404).json({ message: 'Accession not found' });
    const order = await Order.findById(accession.order).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'accessioned' && order.status !== 'grossed') {
      return res.status(400).json({
        message: `Order not ready for grossing. Current status: ${order.status}. Order must be accessioned first (create accession in Receiving or Technician Workflow).`,
      });
    }
    const numBlocks = req.body.numberOfBlocks || 1;
    const baseId = accession.accessionId;
    const existing = await Block.countDocuments({ accession: accession._id });
    for (let i = 1; i <= numBlocks; i++) {
      const blockNumber = existing + i;
      const blockId = `${baseId}-BLK-${String(blockNumber).padStart(3, '0')}`;
      if (!(await Block.findOne({ blockId }))) {
        await Block.create({ blockId, accession: accession._id, blockNumber });
      }
    }
    await Accession.findByIdAndUpdate(accession._id, {
      grossDescription: req.body.grossDescription,
      numberOfBlocks: numBlocks,
      grossedAt: new Date(),
      grossedBy: req.user._id,
    });
    await Order.findByIdAndUpdate(accession.order, { status: 'grossed' });
    const updated = await Accession.findById(accession._id).populate('order').lean();
    res.json(updated);
  }
);

router.post(
  '/processing',
  body('accessionId').trim().notEmpty(),
  body('processorId').optional().trim(),
  body('programName').optional().trim(),
  body('reagentLots').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const accId = escapeRegex(req.body.accessionId);
    const accession = await Accession.findOne({ accessionId: new RegExp(`^${accId}$`, 'i') });
    if (!accession) return res.status(404).json({ message: 'Accession not found' });
    const order = await Order.findById(accession.order).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'grossed') return res.status(400).json({ message: `Order not ready for processing (current status: ${order.status}). Complete grossing first.` });
    await ProcessingRecord.create({
      accession: accession._id,
      processorId: req.body.processorId,
      startTime: req.body.startTime ? new Date(req.body.startTime) : new Date(),
      endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      reagentLots: req.body.reagentLots,
      programName: req.body.programName,
      createdBy: req.user._id,
    });
    await Order.findByIdAndUpdate(accession.order, { status: 'processing' });
    res.json({ message: 'Processing recorded', status: 'processing' });
  }
);

router.post(
  '/embedding',
  body('blockId').trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const block = await Block.findOne({ blockId: new RegExp(`^${req.body.blockId}$`, 'i') }).populate('accession');
    if (!block) return res.status(404).json({ message: 'Block not found' });
    const accession = await Accession.findById(block.accession._id || block.accession).lean();
    if (!accession) return res.status(404).json({ message: 'Accession not found' });
    const order = await Order.findById(accession.order).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'processing' && order.status !== 'embedded') return res.status(400).json({ message: 'Order not ready for embedding' });
    await Block.findByIdAndUpdate(block._id, { embeddingDate: new Date(), embeddedBy: req.user._id });
    await Order.findByIdAndUpdate(accession.order, { status: 'embedded' });
    res.json({ message: 'Embedding recorded', status: 'embedded' });
  }
);

router.post(
  '/sectioning',
  body('blockId').trim().notEmpty(),
  body('numberOfSlides').optional().isInt({ min: 1 }).toInt(),
  body('thickness').optional().trim(),
  body('microtomeId').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const block = await Block.findOne({ blockId: new RegExp(`^${req.body.blockId}$`, 'i') }).populate('accession');
    if (!block) return res.status(404).json({ message: 'Block not found' });
    const accession = await Accession.findById(block.accession._id || block.accession).lean();
    if (!accession) return res.status(404).json({ message: 'Accession not found' });
    const order = await Order.findById(accession.order).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'embedded' && order.status !== 'sectioned') return res.status(400).json({ message: 'Order not ready for sectioning' });
    const numSlides = req.body.numberOfSlides || 1;
    const baseId = block.blockId;
    const existing = await Slide.countDocuments({ block: block._id });
    for (let i = 1; i <= numSlides; i++) {
      const slideNumber = existing + i;
      const slideId = `${baseId}-SLD-${String(slideNumber).padStart(3, '0')}`;
      if (!(await Slide.findOne({ slideId }))) {
        await Slide.create({
          slideId,
          block: block._id,
          slideNumber,
          thickness: req.body.thickness,
          microtomeId: req.body.microtomeId,
          sectionedAt: new Date(),
          sectionedBy: req.user._id,
        });
      }
    }
    await Order.findByIdAndUpdate(accession.order, { status: 'sectioned' });
    res.json({ message: 'Slides created', status: 'sectioned' });
  }
);

router.post(
  '/staining',
  body('slideId').trim().notEmpty(),
  body('stainType').optional().trim(),
  body('qcStatus').optional().isIn(['pending', 'passed', 'failed', 'rejected']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const slide = await Slide.findOne({ slideId: new RegExp(`^${req.body.slideId}$`, 'i') })
      .populate({ path: 'block', populate: 'accession' })
      .lean();
    if (!slide) return res.status(404).json({ message: 'Slide not found' });
    const block = slide.block;
    const accessionId = block?.accession?._id || block?.accession;
    if (!accessionId) return res.status(404).json({ message: 'Accession not found' });
    const accessionDoc = await Accession.findById(accessionId).lean();
    if (!accessionDoc) return res.status(404).json({ message: 'Accession not found' });
    const orderId = accessionDoc.order;
    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const qcStatus = req.body.qcStatus || 'pending';
    let rec = await StainingRecord.findOne({ slide: slide._id });
    if (rec) {
      rec.stainType = req.body.stainType || rec.stainType;
      rec.qcStatus = qcStatus;
      rec.stainedAt = new Date();
      rec.stainedBy = req.user._id;
      await rec.save();
    } else {
      rec = await StainingRecord.create({
        slide: slide._id,
        stainType: req.body.stainType || 'H&E',
        stainedBy: req.user._id,
        qcStatus,
      });
    }
    await Order.findByIdAndUpdate(orderId, { status: 'stained' });
    const slidesForAccession = await Slide.find({ block: slide.block._id || slide.block }).lean();
    const slideIds = slidesForAccession.map((s) => s._id);
    const stainRecs = await StainingRecord.find({ slide: { $in: slideIds } }).lean();
    const allPassed = stainRecs.length > 0 && stainRecs.every((r) => r.qcStatus === 'passed');
    if (allPassed) await Order.findByIdAndUpdate(orderId, { status: 'review' });
    res.json({ stainingRecord: rec, orderStatus: allPassed ? 'review' : 'stained' });
  }
);

export default router;
