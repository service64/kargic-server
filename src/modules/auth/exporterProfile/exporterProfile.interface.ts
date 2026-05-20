import { Types } from 'mongoose';
import type { CompanyType, EmployeeCount } from '../../../type/common.type';

export type { CompanyType, EmployeeCount };

/** Per-section certificate image + admin gate. Exporter submits image id after POST /v1/media. */
export interface IVerificationSubdocBase {
  verifyByAdmin: boolean;
}

export interface IExporterTaxVerification extends IVerificationSubdocBase {
  eTinNumber: string;
  binNumber: string;
  vatBinCertificate?: Types.ObjectId;
}

export interface IExporterBankSolvencyVerification extends IVerificationSubdocBase {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  issueDate: string;
  solvencyCertificate?: Types.ObjectId;
}

export interface IExporterChamberMembershipVerification extends IVerificationSubdocBase {
  chamberName: string;
  memberId: string;
  validityDate: string;
  membershipCertificate?: Types.ObjectId;
}

export interface IExporterErcVerification extends IVerificationSubdocBase {
  ercNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  certificate?: Types.ObjectId;
}

export interface IExporterTradeLicenseVerification extends IVerificationSubdocBase {
  tradeLicenseNumber: string;
  businessType: string;
  issueDate: string;
  expiryDate: string;
  tradeLicenseDocument?: Types.ObjectId;
}

/**
 * Single embedded bundle on ExporterProfile — five sections + aggregate % (20% each verified section).
 */
export interface ICompanyVerificationBundle {
  verifyCompanyPercent: number;
  tax?: IExporterTaxVerification;
  bankSolvency?: IExporterBankSolvencyVerification;
  chamberMembership?: IExporterChamberMembershipVerification;
  erc?: IExporterErcVerification;
  tradeLicense?: IExporterTradeLicenseVerification;
}

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

  /** Tax, bank, chamber, ERC, trade license — one embedded object; images ref Media collection. */
  companyVerification?: ICompanyVerificationBundle;

  createdAt?: Date;
}
