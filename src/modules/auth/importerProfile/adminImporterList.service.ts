import QueryBuilder from '../../../builders/QueryBuilder';
import type { AdminImporterListRowDto } from './adminImporterList.interface';
import { ImporterProfile } from './importerProfile.model';

const escapeRegexChars = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
};

const pickImporterListPaginationQuery = (
  query: Record<string, unknown>,
): Record<string, unknown> => ({
  ...(query.page !== undefined && { page: query.page }),
  ...(query.limit !== undefined && { limit: query.limit }),
});

const shapeAdminImporterRows = (
  rows: Record<string, unknown>[],
): AdminImporterListRowDto[] =>
  rows.map((raw) => ({
    userId:
      raw.userId !== undefined && raw.userId !== null
        ? String(raw.userId)
        : '',
    companyName:
      typeof raw.companyName === 'string' ? raw.companyName.trim() : '',
    importLicense:
      typeof raw.importLicense === 'string' ? raw.importLicense.trim() : '',
    businessType:
      typeof raw.businessType === 'string' ? raw.businessType.trim() : '',
    country: typeof raw.country === 'string' ? raw.country.trim() : '',
  }));

const getImportersForAdminFromDB = async (query: Record<string, unknown>) => {
  const paginationQuery = pickImporterListPaginationQuery(query);
  const andParts: Record<string, unknown>[] = [];

  const companyNameFilter = parseOptionalTrimmedString(query.companyName);
  if (companyNameFilter) {
    andParts.push({
      companyName: new RegExp(escapeRegexChars(companyNameFilter), 'i'),
    });
  }

  const importLicenseFilter = parseOptionalTrimmedString(query.importLicense);
  if (importLicenseFilter) {
    andParts.push({
      importLicense: new RegExp(escapeRegexChars(importLicenseFilter), 'i'),
    });
  }

  const businessTypeFilter = parseOptionalTrimmedString(query.businessType);
  if (businessTypeFilter) {
    andParts.push({
      businessType: new RegExp(escapeRegexChars(businessTypeFilter), 'i'),
    });
  }

  const countryFilter = parseOptionalTrimmedString(query.country);
  if (countryFilter) {
    andParts.push({
      country: new RegExp(escapeRegexChars(countryFilter), 'i'),
    });
  }

  const matchFilter =
    andParts.length === 0
      ? {}
      : andParts.length === 1
        ? andParts[0]!
        : { $and: andParts };

  const importerQB = new QueryBuilder(
    ImporterProfile.find(matchFilter),
    paginationQuery,
  )
    .sort('-createdAt')
    .paginate({ defaultLimit: 20, maxLimit: 100 });

  const meta = await importerQB.countTotal();
  const rawRows = (await importerQB.modelQuery
    .select('userId companyName importLicense businessType country')
    .lean()) as Record<string, unknown>[];

  const data = shapeAdminImporterRows(rawRows);
  return { data, meta };
};

export const AdminImporterListService = {
  getImportersForAdminFromDB,
};
