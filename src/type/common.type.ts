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

/** Chat / media storage quota in MB for each subscription package. */
export const PACKAGE_STORAGE_LIMIT_MB = {
  FREE: 50,
  BASIC: 500,
  VERIFIED: 1000,
  FEATURED: 5000,
} as const satisfies Record<PackageType, number>;

export type StorageLimitMb =
  (typeof PACKAGE_STORAGE_LIMIT_MB)[PackageType];

export function getStorageLimitMbForPackage(pkg: PackageType): StorageLimitMb {
  return PACKAGE_STORAGE_LIMIT_MB[pkg];
}

/** Allowed `storage.limit` values in Mongo (aligned with packages). */
export const STORAGE_LIMIT_MB_VALUES = PACKAGE_TYPES.map(
  (p) => PACKAGE_STORAGE_LIMIT_MB[p],
);

export function isStorageLimitMb(value: number): value is StorageLimitMb {
  return (STORAGE_LIMIT_MB_VALUES as readonly number[]).includes(value);
}
