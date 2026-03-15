import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import orderRoutes from './routes/orders.js';
import patientRoutes from './routes/patients.js';
import paymentRoutes from './routes/payments.js';  
import sampleRoutes from './routes/samples.js';
import workflowRoutes from './routes/workflows.js';
import testTypeRoutes from './routes/testTypes.js'; 
import reportRoutes from './routes/reports.js';
import patientPortalRoutes from './routes/patientPortal.js';
import settingsRoutes from './routes/settings.js';
import publicRoutes from './routes/public.js';
import accessionsRoutes from './routes/accessions.js';
import histologyRoutes from './routes/histology.js';
import ihcRoutes from './routes/ihc.js';
import cytologyRoutes from './routes/cytology.js';
import slideImagesRoutes from './routes/slideImages.js';
import notificationsRoutes from './routes/notifications.js';
import doctorsRoutes from './routes/doctors.js';
import { authMiddleware } from './middleware/auth.js';
import { User } from './models/User.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Allow Vercel frontend and localhost by default; override with CORS_ORIGIN (comma-separated for multiple).
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'https://xpath-web-version.vercel.app'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, origin || allowedOrigins[0]);
    else callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/patients', authMiddleware, patientRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/samples', authMiddleware, sampleRoutes);
app.use('/api/workflows', authMiddleware, workflowRoutes);
app.use('/api/test-types', authMiddleware, testTypeRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/patient-portal', patientPortalRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/accessions', authMiddleware, accessionsRoutes);
app.use('/api/histology', authMiddleware, histologyRoutes);
app.use('/api/ihc', authMiddleware, ihcRoutes);
app.use('/api/cytology', authMiddleware, cytologyRoutes);
app.use('/api/slide-images', authMiddleware, slideImagesRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);
app.use('/api/doctors', authMiddleware, doctorsRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0' }));

// Global error handler: log and return 500 (async route errors are forwarded by express-async-errors)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('[API error]', err.message || err);
  if (err.stack) console.error('[API error] Stack:', err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

/** Ensure default admin exists (create or reset) so hosted backend works without running seed manually. */
async function ensureDefaultAdmin() {
  const adminEmail = 'admin@xpath.lims';
  let admin = await User.findOne({ email: adminEmail }).select('+password');
  if (admin) {
    admin.password = 'admin123';
    admin.name = 'Admin';
    admin.role = 'admin';
    await admin.save();
    console.log('Default admin ready: admin@xpath.lims / admin123');
  } else {
    await User.create({ email: adminEmail, password: 'admin123', name: 'Admin', role: 'admin' });
    console.log('Created default admin: admin@xpath.lims / admin123');
  }
}

const start = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
      await ensureDefaultAdmin();
    } else {
      console.warn('MONGODB_URI not set. Set it for persistence; /api/health will still respond.');
    }
  } catch (e) {
    console.warn('MongoDB connection failed:', e.message);
  }
  app.listen(PORT, () => console.log(`LIMS API listening on http://localhost:${PORT}`));
};

start().catch(console.error);
