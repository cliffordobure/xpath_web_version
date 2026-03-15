import mongoose from 'mongoose';

const processingRecordSchema = new mongoose.Schema({
  accession: { type: mongoose.Schema.Types.ObjectId, ref: 'Accession', required: true },
  processorId: { type: String, trim: true },
  startTime: { type: Date },
  endTime: { type: Date },
  reagentLots: { type: String, trim: true },
  programName: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

processingRecordSchema.index({ accession: 1 });

export const ProcessingRecord = mongoose.model('ProcessingRecord', processingRecordSchema);
