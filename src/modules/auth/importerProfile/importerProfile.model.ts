import { Schema, model } from 'mongoose';
import { IImporterProfile } from './importerProfile.interface';

const importerProfileSchema = new Schema<IImporterProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    importLicense: {
      type: String,
      required: true,
    },
    businessType: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ImporterProfile = model<IImporterProfile>('ImporterProfile', importerProfileSchema);
