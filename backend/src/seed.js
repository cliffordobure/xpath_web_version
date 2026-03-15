import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './models/User.js';
import { TestType } from './models/TestType.js';
import { SystemSettings } from './models/SystemSettings.js';

/** Pathology lab test types with descriptions and typical turnaround. */
const TEST_TYPES = [
  // Histology
  { code: 'HE', name: 'H&E (Haematoxylin & Eosin)', description: 'Routine histology staining for tissue morphology. Standard for surgical pathology.', price: 150, category: 'Histology', turnaroundHours: 48 },
  { code: 'IHC-1', name: 'Immunohistochemistry (single marker)', description: 'Single antibody IHC for protein expression. Antigen retrieval and detection per protocol.', price: 280, category: 'Histology', turnaroundHours: 72 },
  { code: 'IHC-PANEL', name: 'IHC panel (up to 5 markers)', description: 'Multiple IHC markers on same or sequential sections. Used for classification and differential diagnosis.', price: 450, category: 'Histology', turnaroundHours: 96 },
  { code: 'SPECIAL', name: 'Special stains', description: 'Histochemical stains (PAS, Masson, reticulin, etc.) for specific tissue components.', price: 120, category: 'Histology', turnaroundHours: 48 },
  { code: 'FROZEN', name: 'Frozen section', description: 'Intraoperative frozen section for margin assessment or rapid diagnosis. Urgent turnaround.', price: 350, category: 'Histology', turnaroundHours: 1 },
  // Cytology
  { code: 'CYT-PAP', name: 'Cervical cytology (Pap smear)', description: 'Liquid-based or conventional Pap. Screening for cervical abnormalities.', price: 120, category: 'Cytology', turnaroundHours: 48 },
  { code: 'CYT-FNA', name: 'FNA (Fine Needle Aspiration)', description: 'Cytology from FNA samples. Rapid on-site evaluation (ROSE) available on request.', price: 180, category: 'Cytology', turnaroundHours: 48 },
  { code: 'CYT-EFF', name: 'Effusion cytology', description: 'Fluid cytology (pleural, peritoneal, pericardial, CSF) for malignancy and infection.', price: 140, category: 'Cytology', turnaroundHours: 48 },
  // Molecular
  { code: 'MOL-PCR', name: 'Molecular PCR (targeted)', description: 'PCR-based detection of specific mutations or pathogens. Result with interpretation.', price: 350, category: 'Molecular', turnaroundHours: 120 },
  { code: 'MOL-NGS', name: 'Next-generation sequencing (panel)', description: 'Targeted NGS panel for somatic or germline variants. Turnaround depends on panel size.', price: 800, category: 'Molecular', turnaroundHours: 168 },
  { code: 'MOL-FISH', name: 'FISH (Fluorescence in situ hybridization)', description: 'FISH for gene amplification, rearrangements, or copy number. Per probe.', price: 320, category: 'Molecular', turnaroundHours: 72 },
  // Other
  { code: 'CONSULT', name: 'Pathology consultation', description: 'Second opinion or expert review of outside slides/blocks. Report with comparison.', price: 200, category: 'Consultation', turnaroundHours: 72 },
  { code: 'BLOCK-RECUT', name: 'Block recut / levels', description: 'Additional sections from existing block. Per block.', price: 40, category: 'Histology', turnaroundHours: 24 },
];

const seed = async () => {
  if (!process.env.MONGODB_URI) {
    console.log('Set MONGODB_URI to run seed.');
    process.exit(0);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  // Admin user
  const exists = await User.findOne({ email: 'admin@xpath.lims' });
  if (!exists) {
    await User.create({ email: 'admin@xpath.lims', password: 'admin123', name: 'Admin', role: 'admin' });
    console.log('Created admin@xpath.lims / admin123');
  }

  // Test types (pathology lab catalog)
  for (const t of TEST_TYPES) {
    await TestType.findOneAndUpdate(
      { code: t.code },
      { ...t, active: true },
      { upsert: true, new: true }
    );
  }
  console.log(`Upserted ${TEST_TYPES.length} test types (Histology, Cytology, Molecular, Consultation).`);

  // Ensure system settings exist with lab branding defaults
  let settings = await SystemSettings.findOne();
  if (!settings) {
    await SystemSettings.create({});
    console.log('Created default system settings (lab name, currency, tagline, contact, accreditations).');
  }

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
