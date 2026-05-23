import QueryBuilder from '../../../builders/QueryBuilder';
import type { AdminExporterListRowDto } from './adminExporterList.interface';
import { ExporterProfile } from './exporterProfile.model';

const escapeRegexChars = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
};

const pickExporterListPaginationQuery = (
  query: Record<string, unknown>,
): Record<string, unknown> => ({
  ...(query.page !== undefined && { page: query.page }),
  ...(query.limit !== undefined && { limit: query.limit }),
});

const extractLogoUrl = (raw: unknown): string | null => {
  if (!raw || typeof raw !== 'object') return null;
  const img = raw as Record<string, unknown>;
  return typeof img.url === 'string' && img.url.length > 0 ? img.url : null;
};

const extractVerifyCompanyPercent = (raw: unknown): number => {
  if (!raw || typeof raw !== 'object') return 0;
  const cv = raw as Record<string, unknown>;
  const pct = cv.verifyCompanyPercent;
  return typeof pct === 'number' && Number.isFinite(pct) ? pct : 0;
};

const shapeAdminExporterRows = (
  rows: Record<string, unknown>[],
): AdminExporterListRowDto[] =>
  rows.map((raw) => ({
    userId:
      raw.userId !== undefined && raw.userId !== null
        ? String(raw.userId)
        : '',
    companyName:
      typeof raw.companyName === 'string' ? raw.companyName.trim() : '',
    verifyCompanyPercent: extractVerifyCompanyPercent(raw.companyVerification),
    logo: extractLogoUrl(raw.logoUrl),
  }));

const getExportersForAdminFromDB = async (query: Record<string, unknown>) => {
  const paginationQuery = pickExporterListPaginationQuery(query);
  const matchFilter: Record<string, unknown> = {};

  const companyNameFilter = parseOptionalTrimmedString(query.companyName);
  if (companyNameFilter) {
    matchFilter.companyName = new RegExp(
      escapeRegexChars(companyNameFilter),
      'i',
    );
  }

  const exporterQB = new QueryBuilder(
    ExporterProfile.find(matchFilter),
    paginationQuery,
  )
    .sort('-createdAt')
    .paginate({ defaultLimit: 20, maxLimit: 100 });

  const meta = await exporterQB.countTotal();
  const rawRows = (await exporterQB.modelQuery
    .select('userId companyName companyVerification.verifyCompanyPercent logoUrl')
    .populate({ path: 'logoUrl', select: 'url alt' })
    .lean()) as Record<string, unknown>[];

  const data = shapeAdminExporterRows(rawRows);
  return { data, meta };
};

export const AdminExporterListService = {
  getExportersForAdminFromDB,
};
