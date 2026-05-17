import { Schema, model } from 'mongoose';
import type { ISavedExporterDoc } from './savedExporter.interface';

const savedExporterSchema = new Schema<ISavedExporterDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    exporterUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

savedExporterSchema.index({ userId: 1, exporterUserId: 1 }, { unique: true });

export const SavedExporter = model<ISavedExporterDoc>(
  'SavedExporter',
  savedExporterSchema,
);
