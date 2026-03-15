import mongoose from 'mongoose';

const accessionSchema = new mongoose.Schema({
  accessionId: { type: String, required: true, unique: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  receivedAt: { type: Date, default: Date.now },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  grossDescription: { type: String, trim: true },
  numberOfBlocks: { type: Number, default: 1 },
  grossedAt: { type: Date },
  grossedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

accessionSchema.index({ order: 1 });
accessionSchema.index({ accessionId: 1 });

export const Accession = mongoose.model('Accession', accessionSchema);
