import { Schema, model } from 'mongoose';
import { COMPANY_TYPES, EMPLOYEE_COUNTS } from '../../../type/common.type';
import { IExporterProfile } from './exporterProfile.interface';

const exporterProfileSchema = new Schema<IExporterProfile>(
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
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    logoUrl: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    bannerUrl: {
      type: [Schema.Types.ObjectId],
    },
    yearEstablished: {
      type: String,
      required: true,
    },
    companyType: {
      type: String,
      enum: COMPANY_TYPES,
      required: true,
    },
    employeeCount: {
      type: String,
      enum: EMPLOYEE_COUNTS,
      required: true,
    },
    mainProducts: {
      type: [String],
      required: true,
      default: [],
    },
    description: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ExporterProfile = model<IExporterProfile>('ExporterProfile', exporterProfileSchema);
