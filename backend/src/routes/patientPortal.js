import { Router } from 'express';
import { query, body, validationResult } from 'express-validator';
import { Order } from '../models/Order.js';
import { Patient } from '../models/Patient.js';
import { Payment } from '../models/Payment.js';

const router = Router();

function normalizeDob(dateStr) {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dobMatch(patientDob, queryDob) {
  if (!patientDob || !queryDob) return false;
  const p = new Date(patientDob);
  const q = new Date(queryDob);
  return p.getFullYear() === q.getFullYear() && p.getMonth() === q.getMonth() && p.getDate() === q.getDate();
}

function lastMatch(patientLastName, queryLastName) {
  return (patientLastName || '').trim().toLowerCase() === String(queryLastName).trim().toLowerCase();
}

/**
 * List all orders for a patient (no auth). Match by last name + date of birth.
 * Returns orders sorted by createdAt desc so "orders you had done before" appear.
 */
router.get(
  '/orders',
  query('lastName').trim().notEmpty(),
  query('dateOfBirth').trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Last name and date of birth are required' });
    const { lastName, dateOfBirth } = req.query;
    const dob = normalizeDob(dateOfBirth);
    if (!dob) return res.status(400).json({ message: 'Invalid date of birth format (use YYYY-MM-DD)' });
    const patients = await Patient.find({
      lastName: new RegExp('^' + String(lastName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
    }).lean();
    const matchingPatientIds = patients
      .filter((p) => dobMatch(p.dateOfBirth, dob))
      .map((p) => p._id);
    if (matchingPatientIds.length === 0) return res.json([]);
    const orders = await Order.find({ patient: { $in: matchingPatientIds } })
      .populate('patient')
      .populate('testTypes')
      .populate('referringDoctorId', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json(orders);
  }
);

/**
 * Get a single order by id (no auth). Requires lastName + dateOfBirth to verify.
 */
router.get(
  '/order/:orderId',
  query('lastName').trim().notEmpty(),
  query('dateOfBirth').trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Last name and date of birth are required to view this order' });
    const { orderId } = req.params;
    const { lastName, dateOfBirth } = req.query;
    const dob = normalizeDob(dateOfBirth);
    if (!dob) return res.status(400).json({ message: 'Invalid date of birth format (use YYYY-MM-DD)' });
    const order = await Order.findById(orderId).populate('patient').populate('testTypes').populate('referringDoctorId', 'name').lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const patient = order.patient;
    if (!patient) return res.status(404).json({ message: 'Order not found' });
    if (!lastMatch(patient.lastName, lastName) || !dobMatch(patient.dateOfBirth, dob)) {
      return res.status(404).json({ message: 'Order not found. Please check your details.' });
    }
    const payments = await Payment.find({ order: orderId }).sort({ createdAt: -1 }).lean();
    return res.json({ ...order, payments });
  }
);

/**
 * Submit a payment request from the patient portal (e.g. MTN Mobile Money).
 * Creates a pending payment; lab staff confirm when money is received.
 */
const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'mtn_mobile_money', 'orange_money', 'other'];
router.post(
  '/order/:orderId/payment-request',
  query('lastName').trim().notEmpty(),
  query('dateOfBirth').trim().notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('method').isIn(PAYMENT_METHODS),
  body('reference').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    const { orderId } = req.params;
    const { lastName, dateOfBirth } = req.query;
    const { amount, method, reference } = req.body;
    const dob = normalizeDob(dateOfBirth);
    if (!dob) return res.status(400).json({ message: 'Invalid date of birth' });
    const order = await Order.findById(orderId).populate('patient').populate('testTypes').lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const patient = order.patient;
    if (!patient) return res.status(404).json({ message: 'Order not found' });
    if (!lastMatch(patient.lastName, lastName) || !dobMatch(patient.dateOfBirth, dob)) {
      return res.status(403).json({ message: 'Identity verification failed' });
    }
    const payment = await Payment.create({
      order: orderId,
      amount: Number(amount),
      method,
      reference: reference || undefined,
      status: 'pending',
    });
    const populated = await Payment.findById(payment._id).lean();
    res.status(201).json(populated);
  }
);

/**
 * Look up a single order by order number + last name + date of birth (kept for backward compatibility).
 */
router.get(
  '/lookup',
  query('orderNumber').trim().notEmpty(),
  query('lastName').trim().notEmpty(),
  query('dateOfBirth').trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Order number, last name, and date of birth are required' });
    const { orderNumber, lastName, dateOfBirth } = req.query;
    const dob = normalizeDob(dateOfBirth);
    if (!dob) return res.status(400).json({ message: 'Invalid date of birth format (use YYYY-MM-DD)' });
    const order = await Order.findOne({ orderNumber: String(orderNumber).trim().toUpperCase() })
      .populate('patient')
      .populate('testTypes')
      .lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const patient = order.patient;
    if (!patient) return res.status(404).json({ message: 'Order not found' });
    if (!lastMatch(patient.lastName, lastName) || !dobMatch(patient.dateOfBirth, dob)) {
      return res.status(404).json({ message: 'Order not found. Please check your order number, last name, and date of birth.' });
    }
    return res.json(order);
  }
);

export default router;
