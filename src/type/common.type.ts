export const COMPANY_TYPES = [
  'SOLE_PROPRIETORSHIP',
  'PARTNERSHIP',
  'PRIVATE_LIMITED',
  'PUBLIC_LIMITED',
  'OTHER',
] as const;

export type CompanyType = (typeof COMPANY_TYPES)[number];

export const EMPLOYEE_COUNTS = ['1_10', '11_50', '51_200', '201_500', '501_PLUS'] as const;

export type EmployeeCount = (typeof EMPLOYEE_COUNTS)[number];

export const PACKAGE_TYPES = ['FREE', 'BASIC', 'VERIFIED', 'FEATURED'] as const;

export type PackageType = (typeof PACKAGE_TYPES)[number];
