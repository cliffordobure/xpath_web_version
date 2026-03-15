import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { Order } from '../models/Order.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const LOGO_HEIGHT = 28;
const LOGO_WIDTH = 120;

/** Resolve logo path: try frontend assets, then backend assets (so PDF has logo in top right and at end) */
function getLogoPath() {
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'assets', 'logo_large.png'),
    path.join(process.cwd(), 'frontend', 'src', 'assets', 'logo_large.png'),
    path.join(process.cwd(), '..', 'frontend', 'src', 'assets', 'logo_large.png'),
    path.join(process.cwd(), 'assets', 'logo_large.png'),
    path.join(__dirname, '..', '..', 'assets', 'logo_large.png'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

/** Build report PDF content into an existing PDFDocument (pipe to res or to buffer). */
function buildReportPdfContent(doc, order) {
  const patient = order.patient;
  const patientName = patient ? [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() : '-';
  const dob = patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '-';
  const testNames = (order.testTypes || []).map((t) => (t && t.name) || t).filter(Boolean).join(', ') || '-';
  const reportSummary = order.reportSummary || '-';
  const pathologistDiagnosis = order.pathologistDiagnosis || '-';
  const reportLockedAt = order.reportLockedAt ? new Date(order.reportLockedAt).toLocaleString() : null;
  const isDraft = !order.reportLockedAt;

  const logoPath = getLogoPath();
  const marginLeft = (doc.page && doc.page.margins && doc.page.margins.left) ? doc.page.margins.left : 50;
  if (logoPath) {
    doc.image(logoPath, marginLeft, 50, { width: LOGO_WIDTH, height: LOGO_HEIGHT });
  }

  doc.fontSize(18).text('Pathology Report', { align: 'center' });
  doc.moveDown(0.5);
  if (isDraft) {
    doc.fontSize(10).fillColor('red').text('DRAFT - Not final. Do not use for clinical decisions.', { align: 'center' });
    doc.fillColor('black').moveDown(1);
  }
  doc.moveDown(1.5);
  doc.fontSize(10);

  doc.text('Order number: ' + (order.orderNumber || '-'), { continued: false });
  doc.text('Date of report: ' + (reportLockedAt || new Date().toLocaleString()), { continued: false });
  doc.moveDown(2.5);

  doc.fontSize(12).text('Patient', { underline: true });
  doc.fontSize(10);
  doc.text('Name: ' + patientName);
  doc.text('Date of birth: ' + dob);
  doc.moveDown(1);

  doc.fontSize(12).text('Tests', { underline: true });
  doc.fontSize(10).text(testNames);
  doc.moveDown(1);

  doc.fontSize(12).text('Result summary', { underline: true });
  doc.fontSize(10).text(reportSummary);
  doc.moveDown(1);

  doc.fontSize(12).text('Pathologist diagnosis', { underline: true });
  doc.fontSize(10).text(pathologistDiagnosis);

  if (order.referringDoctor) {
    doc.moveDown(1);
    doc.fontSize(10).text('Referring physician: ' + order.referringDoctor);
  }
}

/** Generate report PDF as Buffer for an order (populated). */
async function generateReportPdfBuffer(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildReportPdfContent(doc, order);
    doc.end();
  });
}

router.get('/', async (req, res) => {
  const { from, to, status, limit = 100 } = req.query;
  const filter = {};
  if (from) filter.createdAt = { $gte: new Date(from) };
  if (to) filter.createdAt = { ...filter.createdAt, $lte: new Date(to) };
  if (status) filter.status = status;
  // Pathologists see only orders assigned to them
  if (req.user?.role === 'pathologist' && req.user?._id) {
    filter.assignedPathologist = req.user._id;
  }
  const data = await Order.find(filter).populate('patient').populate('testTypes').sort({ createdAt: -1 }).limit(Math.min(200, parseInt(limit, 10))).lean();
  res.json(data);
});

/** Ensure pathologist can only access orders assigned to them */
function pathologistCanAccessOrder(order, user) {
  if (user?.role !== 'pathologist') return true;
  if (!user?._id || !order?.assignedPathologist) return false;
  return String(order.assignedPathologist) === String(user._id);
}

/** Generate and download PDF report for an order (for receptionist to give or send to patient) */
router.get('/:orderId/pdf', async (req, res) => {
  const { orderId } = req.params;
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }
  const order = await Order.findById(orderId).populate('patient').populate('testTypes').lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!pathologistCanAccessOrder(order, req.user)) return res.status(404).json({ message: 'Order not found' });

  const filename = 'report-' + (order.orderNumber || orderId).replace(/[^a-zA-Z0-9-_]/g, '_') + '.pdf';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  buildReportPdfContent(doc, order);
  doc.end();
});

/** Email report PDF to client. Body: { email?: string }. If email omitted, uses order.patient.email. */
router.post('/:orderId/email', async (req, res) => {
  const { orderId } = req.params;
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }
  const order = await Order.findById(orderId).populate('patient').populate('testTypes').lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!pathologistCanAccessOrder(order, req.user)) return res.status(404).json({ message: 'Order not found' });

  const email = (req.body && req.body.email && String(req.body.email).trim()) || (order.patient && order.patient.email && String(order.patient.email).trim());
  if (!email) {
    return res.status(400).json({ message: 'No email address. Provide email in request body or ensure the patient has an email on file.' });
  }

  const pdfBuffer = await generateReportPdfBuffer(order);
  const filename = 'report-' + (order.orderNumber || orderId).replace(/[^a-zA-Z0-9-_]/g, '_') + '.pdf';

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@xpathlabs.local';
  const patientName = order.patient ? [order.patient.firstName, order.patient.lastName].filter(Boolean).join(' ').trim() : 'Patient';

  await transporter.sendMail({
    from,
    to: email,
    subject: `Your pathology report – Order ${order.orderNumber || orderId}`,
    text: `Please find your pathology report attached for order ${order.orderNumber || orderId} (${patientName}).`,
    attachments: [{ filename, content: pdfBuffer }],
  });

  res.json({ message: 'Report sent to ' + email });
});

export default router;
