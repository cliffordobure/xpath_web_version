import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { TestType } from '../models/TestType.js';
import { SlideImage } from '../models/SlideImage.js';
import { Order } from '../models/Order.js';
import { Patient } from '../models/Patient.js';
import { SystemSettings } from '../models/SystemSettings.js';

const router = Router();

/** Public config for landing page — no auth. Returns lab branding, contact, and display options. */
router.get('/config', async (req, res) => {
  const defaults = {
    currency: 'USD',
    labName: 'X-PATH LIMS',
    tagline: 'Reliable results. Clear pricing. Fast turnaround.',
    aboutText: 'We are a pathology and molecular diagnostics laboratory committed to accurate diagnosis, transparent pricing, and timely reporting.',
    contactEmail: null,
    contactPhone: null,
    contactAddress: null,
    businessHours: 'Mon–Fri 8:00–18:00; Sat 8:00–12:00',
    accreditations: ['CAP', 'ISO 15189'],
    privacyPolicyUrl: null,
    termsUrl: null,
  };
  if (mongoose.connection.readyState !== 1) {
    return res.json(defaults);
  }
  try {
    const doc = await SystemSettings.findOne()
      .select('currency labName tagline aboutText contactEmail contactPhone contactAddress businessHours accreditations privacyPolicyUrl termsUrl')
      .lean();
    if (!doc) return res.json(defaults);
    res.json({
      currency: doc.currency ?? defaults.currency,
      labName: doc.labName ?? defaults.labName,
      tagline: doc.tagline ?? defaults.tagline,
      aboutText: doc.aboutText ?? defaults.aboutText,
      contactEmail: doc.contactEmail ?? defaults.contactEmail,
      contactPhone: doc.contactPhone ?? defaults.contactPhone,
      contactAddress: doc.contactAddress ?? defaults.contactAddress,
      businessHours: doc.businessHours ?? defaults.businessHours,
      accreditations: Array.isArray(doc.accreditations) && doc.accreditations.length ? doc.accreditations : defaults.accreditations,
      privacyPolicyUrl: doc.privacyPolicyUrl ?? defaults.privacyPolicyUrl,
      termsUrl: doc.termsUrl ?? defaults.termsUrl,
    });
  } catch (e) {
    console.error('public/config:', e.message);
    res.json(defaults);
  }
});

/** Optional: require X-API-Key header to match SCANNER_API_KEY for scanner uploads */
const scannerKeyMiddleware = (req, res, next) => {
  const key = process.env.SCANNER_API_KEY;
  if (!key) return next();
  const provided = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (provided !== key) return res.status(401).json({ message: 'Invalid or missing scanner API key' });
  next();
};

/** Public list of active services (test types) with name, description, price — no auth */
router.get('/services', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json([]);
  }
  try {
    const data = await TestType.find({ active: true })
      .select('code name description price category turnaroundHours')
      .sort({ category: 1, code: 1 })
      .limit(200)
      .lean();
    res.json(data);
  } catch (e) {
    console.error('public/services:', e.message);
    res.json([]);
  }
});

/** Public: place an order online (patient/hospital). Creates patient if needed, creates order with ready_for_pickup so couriers get it. No auth. */
router.post(
  '/order-request',
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('dateOfBirth').optional().trim(),
  body('phone').trim().notEmpty().withMessage('Phone required so courier can contact you'),
  body('email').optional().trim().isEmail().withMessage('Invalid email').optional({ values: 'falsy' }),
  body('address').optional().trim(),
  body('pickupAddress').optional().trim(),
  body('pickupPlaceName').optional().trim(),
  body('pickupLat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('pickupLng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('testTypes').isArray().withMessage('testTypes must be an array'),
  body('testTypes.*').optional().isMongoId().withMessage('Invalid test type ID'),
  body('referringDoctor').optional().trim(),
  body('notes').optional().trim(),
  async (req, res) => {
    console.log('[public/order-request] Request received');
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
      }
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ message: 'Service temporarily unavailable' });
      }
      const body = req.body || {};
      const { firstName, lastName, dateOfBirth, phone, email, address, pickupAddress, pickupPlaceName, pickupLat, pickupLng, testTypes = [], referringDoctor, notes } = body;
      const patient = await Patient.create({
        firstName: String(firstName || '').trim(),
        lastName: String(lastName || '').trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        phone: (phone && String(phone).trim()) || undefined,
        email: (email && String(email).trim().toLowerCase()) || undefined,
        address: (address && String(address).trim()) || undefined,
        referringDoctor: (referringDoctor && String(referringDoctor).trim()) || undefined,
        notes: (notes && String(notes).trim()) || undefined,
      });
      const count = await Order.countDocuments();
      const orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
      const validTestTypeIds = Array.isArray(testTypes)
        ? testTypes.filter((id) => mongoose.Types.ObjectId.isValid(id))
        : [];
      const order = await Order.create({
        orderNumber,
        patient: patient._id,
        testTypes: validTestTypeIds,
        status: 'draft',
        orderSource: 'online',
        courierStatus: 'ready_for_pickup',
        courierCheckedInAt: new Date(),
        pickupAddress: (pickupAddress && String(pickupAddress).trim()) || (address && String(address).trim()) || undefined,
        pickupPlaceName: (pickupPlaceName && String(pickupPlaceName).trim()) || undefined,
        pickupLat: pickupLat != null && pickupLat !== '' ? Number(pickupLat) : undefined,
        pickupLng: pickupLng != null && pickupLng !== '' ? Number(pickupLng) : undefined,
        referringDoctor: (referringDoctor && String(referringDoctor).trim()) || undefined,
        notes: (notes && String(notes).trim()) || undefined,
      });
      const populated = await Order.findById(order._id).populate('patient').populate('testTypes').lean();
      res.status(201).json({ order: populated, orderNumber });
    } catch (e) {
      console.error('[public/order-request] ERROR:', e.message);
      console.error('[public/order-request] Stack:', e.stack);
      if (e.name) console.error('[public/order-request] Name:', e.name);
      res.status(500).json({ message: e.message || 'Failed to create order' });
    }
  }
);

/** Scanner: register a slide image (URL) for an order. Set SCANNER_API_KEY and send X-API-Key header, or leave unset for dev. */
router.post(
  '/slide-image',
  scannerKeyMiddleware,
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
