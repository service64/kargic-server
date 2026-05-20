import { Schema, model } from 'mongoose';
import { COMPANY_TYPES, EMPLOYEE_COUNTS } from '../../../type/common.type';
import type { IExporterProfile } from './exporterProfile.interface';

const verifyFlag = {
  verifyByAdmin: { type: Boolean, default: false },
};

const taxVerificationSchema = new Schema(
  {
    eTinNumber: { type: String, default: '' },
    binNumber: { type: String, default: '' },
    vatBinCertificate: { type: Schema.Types.ObjectId, ref: 'Image' },
    ...verifyFlag,
  },
  { _id: false },
);

const bankSolvencyVerificationSchema = new Schema(
  {
    bankName: { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    issueDate: { type: String, default: '' },
    solvencyCertificate: { type: Schema.Types.ObjectId, ref: 'Image' },
    ...verifyFlag,
  },
  { _id: false },
);

const chamberMembershipVerificationSchema = new Schema(
  {
    chamberName: { type: String, default: '' },
    memberId: { type: String, default: '' },
    validityDate: { type: String, default: '' },
    membershipCertificate: { type: Schema.Types.ObjectId, ref: 'Image' },
    ...verifyFlag,
  },
  { _id: false },
);

const ercVerificationSchema = new Schema(
  {
    ercNumber: { type: String, default: '' },
    issuingAuthority: { type: String, default: '' },
    issueDate: { type: String, default: '' },
    expiryDate: { type: String, default: '' },
    certificate: { type: Schema.Types.ObjectId, ref: 'Image' },
    ...verifyFlag,
  },
  { _id: false },
);

const tradeLicenseVerificationSchema = new Schema(
  {
    tradeLicenseNumber: { type: String, default: '' },
    businessType: { type: String, default: '' },
    issueDate: { type: String, default: '' },
    expiryDate: { type: String, default: '' },
    tradeLicenseDocument: { type: Schema.Types.ObjectId, ref: 'Image' },
    ...verifyFlag,
  },
  { _id: false },
);

const companyVerificationSchema = new Schema(
  {
    verifyCompanyPercent: { type: Number, default: 0, min: 0, max: 100 },
    tax: { type: taxVerificationSchema, required: false },
    bankSolvency: { type: bankSolvencyVerificationSchema, required: false },
    chamberMembership: {
      type: chamberMembershipVerificationSchema,
      required: false,
    },
    erc: { type: ercVerificationSchema, required: false },
    tradeLicense: { type: tradeLicenseVerificationSchema, required: false },
  },
  { _id: false },
);

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
      ref: 'Image',
      required: false,
    },
    /** Up to 3 fixed slots (left → right). Independent refs; no holes in the DB. */
    banner0: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
    },
    banner1: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
    },
    banner2: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
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
    companyVerification: {
      type: companyVerificationSchema,
      required: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const ExporterProfile = model<IExporterProfile>(
  'ExporterProfile',
  exporterProfileSchema,
);
