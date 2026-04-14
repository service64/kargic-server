import { Types } from 'mongoose';

export interface IImporterProfile {
  userId: Types.ObjectId;
  companyName: string;
  importLicense: string;
  businessType: string;
  country: string;
  createdAt?: Date;
}
