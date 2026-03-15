import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { SystemSettings, SUPPORTED_CURRENCIES } from '../models/SystemSettings.js';
import { roleMiddleware } from '../middleware/auth.js';

const router = Router();

async function getOrCreate() {
  let doc = await SystemSettings.findOne().lean();
  if (!doc) {
    doc = (await SystemSettings.create({})).toObject();
  }
  return doc;
}

router.get('/', async (req, res) => {
  const doc = await getOrCreate();
  res.json(doc);
});

const RECEPTIONIST_STEP_IDS = ['receive', 'payment', 'courier', 'assign', 'results'];

router.put(
  '/',
  roleMiddleware('admin'),
  body('labName').optional().trim(),
  body('tagline').optional().trim(),
  body('aboutText').optional().trim(),
  body('contactEmail').optional().trim().isEmail().withMessage('Invalid contact email').optional({ values: 'falsy' }),
  body('contactPhone').optional().trim(),
  body('contactAddress').optional().trim(),
  body('businessHours').optional().trim(),
  body('accreditations').optional().isArray(),
  body('accreditations.*').optional().trim(),
  body('privacyPolicyUrl').optional().trim().isURL().withMessage('Invalid URL').optional({ values: 'falsy' }),
  body('termsUrl').optional().trim().isURL().withMessage('Invalid URL').optional({ values: 'falsy' }),
  body('timezone').optional().trim(),
  body('dateFormat').optional().trim(),
  body('currency').optional().isIn(SUPPORTED_CURRENCIES),
  body('receptionistWorkflowSteps').optional().isArray(),
  body('receptionistWorkflowSteps.*').optional().isIn(RECEPTIONIST_STEP_IDS),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const updates = {};
    if (req.body.labName !== undefined) updates.labName = req.body.labName;
    if (req.body.tagline !== undefined) updates.tagline = req.body.tagline;
    if (req.body.aboutText !== undefined) updates.aboutText = req.body.aboutText;
    if (req.body.contactEmail !== undefined) updates.contactEmail = req.body.contactEmail;
    if (req.body.contactPhone !== undefined) updates.contactPhone = req.body.contactPhone;
    if (req.body.contactAddress !== undefined) updates.contactAddress = req.body.contactAddress;
    if (req.body.businessHours !== undefined) updates.businessHours = req.body.businessHours;
    if (req.body.accreditations !== undefined) {
      updates.accreditations = Array.isArray(req.body.accreditations)
        ? req.body.accreditations.map((s) => String(s).trim()).filter(Boolean)
        : [];
    }
    if (req.body.privacyPolicyUrl !== undefined) updates.privacyPolicyUrl = req.body.privacyPolicyUrl;
    if (req.body.termsUrl !== undefined) updates.termsUrl = req.body.termsUrl;
    if (req.body.timezone !== undefined) updates.timezone = req.body.timezone;
    if (req.body.dateFormat !== undefined) updates.dateFormat = req.body.dateFormat;
    if (req.body.currency !== undefined) updates.currency = req.body.currency;
    if (req.body.receptionistWorkflowSteps !== undefined) {
      const steps = Array.isArray(req.body.receptionistWorkflowSteps)
        ? req.body.receptionistWorkflowSteps.filter((s) => RECEPTIONIST_STEP_IDS.includes(s))
        : [];
      updates.receptionistWorkflowSteps = steps.length ? steps : RECEPTIONIST_STEP_IDS;
    }
    let doc = await SystemSettings.findOne();
    if (!doc) doc = await SystemSettings.create({});
    await SystemSettings.updateOne({ _id: doc._id }, { $set: updates });
    doc = await SystemSettings.findById(doc._id).lean();
    res.json(doc);
  }
);

export default router;
