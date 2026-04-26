import { Types } from 'mongoose';
import type { CompanyType, EmployeeCount } from '../../../type/common.type';

export type { CompanyType, EmployeeCount };

export interface IExporterProfile {
  userId: Types.ObjectId;
  companyName: string;
  slug: string;
  logoUrl?: Types.ObjectId;
  /** Fixed banner slots; legacy `bannerUrl` array in DB is read in the service. */
  banner0?: Types.ObjectId;
  banner1?: Types.ObjectId;
  banner2?: Types.ObjectId;
  yearEstablished: string;
  identificationNumber?: string;
  companyType: CompanyType;
  employeeCount: EmployeeCount;

  mainProducts: string[];

  description?: string;

  createdAt?: Date;
}
