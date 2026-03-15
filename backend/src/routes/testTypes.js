import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { TestType } from '../models/TestType.js';
import { roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { active, search, limit = 100 } = req.query;
  const filter = {};
  if (active !== undefined) filter.active = active === 'true';
  if (search) filter.$or = [{ code: new RegExp(search, 'i') }, { name: new RegExp(search, 'i') }];
  const data = await TestType.find(filter).sort({ code: 1 }).limit(Math.min(200, parseInt(limit, 10))).lean();
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const testType = await TestType.findById(req.params.id).lean();
  if (!testType) return res.status(404).json({ message: 'Test type not found' });
  res.json(testType);
});

router.post(
  '/',
  roleMiddleware('admin'),
  body('code').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().trim(),
  body('turnaroundHours').optional().isInt({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    if (await TestType.findOne({ code: req.body.code })) return res.status(400).json({ message: 'Code already exists' });
    const testType = await TestType.create(req.body);
    res.status(201).json(testType);
  }
);

router.patch('/:id', roleMiddleware('admin'), async (req, res) => {
  const allowed = ['code', 'name', 'description', 'price', 'category', 'turnaroundHours', 'active'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  const testType = await TestType.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
  if (!testType) return res.status(404).json({ message: 'Test type not found' });
  res.json(testType);
});

export default router;
