import { Types } from 'mongoose';
import type { CompanyType, EmployeeCount } from '../../../type/common.type';

export type { CompanyType, EmployeeCount };

export interface IExporterProfile {
  userId: Types.ObjectId;
  companyName: string;
  slug: string;
  logoUrl?: Types.ObjectId;
  bannerUrl?: Types.ObjectId[];
  yearEstablished: string;
  identificationNumber?: string;
  companyType: CompanyType;
  employeeCount: EmployeeCount;

  mainProducts: string[];

  description?: string;

  createdAt?: Date;
}
