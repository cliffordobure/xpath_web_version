import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema({
  blockId: { type: String, required: true, unique: true },
  accession: { type: mongoose.Schema.Types.ObjectId, ref: 'Accession', required: true },
  blockNumber: { type: Number, required: true },
  embeddingDate: { type: Date },
  embeddedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

blockSchema.index({ accession: 1 });

export const Block = mongoose.model('Block', blockSchema);
