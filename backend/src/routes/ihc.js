import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Accession } from '../models/Accession.js';
import { Block } from '../models/Block.js';
import { Slide } from '../models/Slide.js';
import { IHCStainRecord } from '../models/IHCStainRecord.js';

const router = Router();

function escapeRegex(s) {
  return String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Get accession with blocks and slides (same data as histology — for selecting slides for IHC) */
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

/** List IHC stain records for a slide */
router.get('/slides/:slideId/stains', async (req, res) => {
  const slideId = escapeRegex(req.params.slideId);
  if (!slideId) return res.status(400).json({ message: 'Slide ID is required' });
  const slide = await Slide.findOne({ slideId: new RegExp(`^${slideId}$`, 'i') }).lean();
  if (!slide) return res.status(404).json({ message: 'Slide not found' });
  const stains = await IHCStainRecord.find({ slide: slide._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json(stains);
});

/** Record an IHC stain on a slide */
router.post(
  '/stain',
  body('slideId').trim().notEmpty(),
  body('antibody').trim().notEmpty(),
  body('clone').optional().trim(),
  body('dilution').optional().trim(),
  body('antigenRetrieval').optional().trim(),
  body('detectionMethod').optional().trim(),
  body('counterstain').optional().trim(),
  body('qcStatus').optional().isIn(['pending', 'passed', 'failed', 'rejected']),
  body('notes').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const slide = await Slide.findOne({ slideId: new RegExp(`^${req.body.slideId}$`, 'i') }).lean();
    if (!slide) return res.status(404).json({ message: 'Slide not found' });
    const rec = await IHCStainRecord.create({
      slide: slide._id,
      antibody: req.body.antibody,
      clone: req.body.clone || undefined,
      dilution: req.body.dilution || undefined,
      antigenRetrieval: req.body.antigenRetrieval || undefined,
      detectionMethod: req.body.detectionMethod || undefined,
      counterstain: req.body.counterstain || undefined,
      stainedBy: req.user._id,
      qcStatus: req.body.qcStatus || 'pending',
      notes: req.body.notes || undefined,
    });
    const populated = await IHCStainRecord.findById(rec._id).populate('slide').lean();
    res.status(201).json(populated);
  }
);

export default router;
