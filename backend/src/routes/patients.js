import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Patient } from '../models/Patient.js';

const router = Router();

router.get('/', async (req, res) => {
  const { search, limit = 50, page = 1 } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { nationalId: new RegExp(search, 'i') },
    ];
  }
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
  const [data, total] = await Promise.all([
    Patient.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Math.min(100, parseInt(limit, 10))).lean(),
    Patient.countDocuments(filter),
  ]);
  res.json({ data, total, page: parseInt(page, 10), limit: Math.min(100, parseInt(limit, 10)) });
});

router.get('/:id', async (req, res) => {
  const patient = await Patient.findById(req.params.id).lean();
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  res.json(patient);
});

router.post(
  '/',
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('dateOfBirth').optional(),
  body('gender').optional().isIn(['male', 'female', 'other', '']),
  body('phone').optional().trim(),
  body('email').optional().isEmail(),
  body('address').optional().trim(),
  body('nationalId').optional().trim(),
  body('referringDoctor').optional().trim(),
  body('notes').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const patient = await Patient.create(req.body);
    res.status(201).json(patient);
  }
);

router.patch('/:id', async (req, res) => {
  const allowed = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'email', 'address', 'nationalId', 'referringDoctor', 'notes'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  const patient = await Patient.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  res.json(patient);
});

export default router;
