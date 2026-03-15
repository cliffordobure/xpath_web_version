import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Accession } from '../models/Accession.js';
import { Order } from '../models/Order.js';
import { Sample } from '../models/Sample.js';

const router = Router();

function generateAccessionId() {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(100000 + Math.random() * 900000);
  return `XP-${year}-${String(random).padStart(6, '0')}`;
}

router.get('/', async (req, res) => {
  const { orderId, accessionId } = req.query;
  const filter = {};
  if (orderId) filter.order = orderId;
  if (accessionId) filter.accessionId = new RegExp(accessionId, 'i');
  const data = await Accession.find(filter)
    .populate('order')
    .populate({ path: 'order', populate: { path: 'patient' } })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(data);
});

/** Create Sample records for Accessions that don't have one yet (so Inventory shows received specimens). Call once to backfill. */
router.post('/backfill-samples', async (req, res) => {
  const accessions = await Accession.find({}).lean();
  let created = 0;
  for (const acc of accessions) {
    const exists = await Sample.findOne({ order: acc.order, label: acc.accessionId }).lean();
    if (!exists) {
      await Sample.create({
        order: acc.order,
        label: acc.accessionId,
        type: 'tissue',
        status: 'received',
        receivedAt: acc.receivedAt || new Date(),
      });
      created++;
    }
  }
  res.json({ message: `Created ${created} sample(s) for existing accessions.`, created });
});

router.get('/by-order/:orderId', async (req, res) => {
  const accession = await Accession.findOne({ order: req.params.orderId })
    .populate('order')
    .populate({ path: 'order', populate: { path: 'patient' } })
    .lean();
  if (!accession) return res.status(404).json({ message: 'Accession not found for this order' });
  res.json(accession);
});

router.post(
  '/',
  body('orderId').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid order ID', errors: errors.array() });
    const order = await Order.findById(req.body.orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const receivable = ['draft', 'received', 'assigned'];
    let accession = await Accession.findOne({ order: req.body.orderId }).lean();
    if (accession) {
      await Order.findByIdAndUpdate(req.body.orderId, { status: 'accessioned' });
      accession = await Accession.findById(accession._id).populate('order').populate({ path: 'order', populate: { path: 'patient' } }).lean();
      return res.json(accession);
    }
    if (!receivable.includes(order.status))
      return res.status(400).json({ message: `Order status is "${order.status}". To create an accession, order must be Draft, Received, or Assigned.` });
    try {
      let accessionId = generateAccessionId();
      while (await Accession.findOne({ accessionId })) accessionId = generateAccessionId();
      accession = await Accession.create({
        accessionId,
        order: req.body.orderId,
        receivedAt: new Date(),
        ...(req.user && req.user._id ? { receivedBy: req.user._id } : {}),
      });
      await Order.findByIdAndUpdate(req.body.orderId, { status: 'accessioned' });
      // Create a Sample so it appears in Inventory (sample = received specimen)
      await Sample.create({
        order: req.body.orderId,
        label: accession.accessionId,
        type: 'tissue',
        status: 'received',
        receivedAt: new Date(),
      });
      accession = await Accession.findById(accession._id).populate('order').populate({ path: 'order', populate: { path: 'patient' } }).lean();
      res.status(201).json(accession);
    } catch (err) {
      console.error('Accession create error:', err.message);
      res.status(500).json({ message: err.message || 'Failed to create accession' });
    }
  }
);

export default router;
