import QueryBuilder from '../../../builders/QueryBuilder';
import { ExporterProfile } from './exporterProfile.model';
import type {
  AdminSellerVerificationRowDto,
  SellerVerificationDocStage,
  SellerVerificationStatus,
} from './adminSellerVerification.interface';

const escapeRegexChars = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
};

const DOC_SECTION_KEYS = [
  'tax',
  'bankSolvency',
  'chamberMembership',
  'erc',
  'tradeLicense',
] as const;

const sectionHasData = (section: unknown): boolean => {
  if (!section || typeof section !== 'object') return false;
  return Object.entries(section as Record<string, unknown>).some(
    ([k, v]) => k !== 'verifyByAdmin' && v != null && v !== '',
  );
};

const sectionToDocStage = (section: unknown): SellerVerificationDocStage => {
  if (!sectionHasData(section)) return 'pending';
  if ((section as { verifyByAdmin?: boolean }).verifyByAdmin === true) {
    return 'complete';
  }
  return 'warning';
};

const deriveSellerStatus = (
  percent: number,
  docs: AdminSellerVerificationRowDto['docs'],
  cv: unknown,
): SellerVerificationStatus => {
  if (docs.every((d) => d === 'complete') || percent >= 100) {
    return 'Verified';
  }
  if (percent > 0) return 'Reviewing';
  if (
    cv &&
    typeof cv === 'object' &&
    DOC_SECTION_KEYS.some((k) => sectionHasData((cv as Record<string, unknown>)[k]))
  ) {
    return 'Reviewing';
  }
  return 'Flagged';
};

const extractLogoUrl = (raw: unknown): string | null => {
  if (!raw || typeof raw !== 'object') return null;
  const img = raw as Record<string, unknown>;
  return typeof img.url === 'string' && img.url.length > 0 ? img.url : null;
};

const extractVerifyPercent = (raw: unknown): number => {
  if (!raw || typeof raw !== 'object') return 0;
  const pct = (raw as Record<string, unknown>).verifyCompanyPercent;
  return typeof pct === 'number' && Number.isFinite(pct) ? pct : 0;
};

const buildDocsTuple = (
  cv: unknown,
): AdminSellerVerificationRowDto['docs'] => {
  const o =
    cv && typeof cv === 'object' ? (cv as Record<string, unknown>) : {};
  return [
    sectionToDocStage(o.tax),
    sectionToDocStage(o.bankSolvency),
    sectionToDocStage(o.chamberMembership),
    sectionToDocStage(o.erc),
    sectionToDocStage(o.tradeLicense),
  ];
};

const shapeRow = (raw: Record<string, unknown>): AdminSellerVerificationRowDto => {
  const cv = raw.companyVerification;
  const percent = extractVerifyPercent(cv);
  const docs = buildDocsTuple(cv);
  const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
  const createdAt = raw.createdAt;

  return {
    userId:
      raw.userId !== undefined && raw.userId !== null
        ? String(raw.userId)
        : '',
    companyName:
      typeof raw.companyName === 'string' ? raw.companyName.trim() : '',
    slug,
    displayId: slug ? slug.toUpperCase() : '—',
    submittedAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === 'string'
          ? createdAt
          : new Date().toISOString(),
    verifyCompanyPercent: percent,
    docs,
    status: deriveSellerStatus(percent, docs, cv),
    companyType:
      typeof raw.companyType === 'string' ? raw.companyType.trim() : '',
    logo: extractLogoUrl(raw.logoUrl),
  };
};

const applyStatusFilter = (
  matchFilter: Record<string, unknown>,
  status: SellerVerificationStatus,
) => {
  if (status === 'Verified') {
    matchFilter['companyVerification.verifyCompanyPercent'] = { $gte: 100 };
    return;
  }
  if (status === 'Reviewing') {
    matchFilter['companyVerification.verifyCompanyPercent'] = {
      $gt: 0,
      $lt: 100,
    };
    return;
  }
  if (status === 'Flagged') {
    matchFilter.$or = [
      { companyVerification: { $exists: false } },
      { companyVerification: null },
      { 'companyVerification.verifyCompanyPercent': { $exists: false } },
      { 'companyVerification.verifyCompanyPercent': { $lte: 0 } },
    ];
  }
};

const countPipelineTotal = () =>
  ExporterProfile.countDocuments({
    $or: [
      { companyVerification: { $exists: false } },
      { companyVerification: null },
      { 'companyVerification.verifyCompanyPercent': { $exists: false } },
      { 'companyVerification.verifyCompanyPercent': { $lt: 100 } },
    ],
  });

const getSellerVerificationForAdminFromDB = async (
  query: Record<string, unknown>,
) => {
  const paginationQuery = {
    ...(query.page !== undefined && { page: query.page }),
    ...(query.limit !== undefined && { limit: query.limit }),
  };

  const andParts: Record<string, unknown>[] = [];

  const search = parseOptionalTrimmedString(query.search);
  if (search) {
    const re = new RegExp(escapeRegexChars(search), 'i');
    andParts.push({ $or: [{ companyName: re }, { slug: re }] });
  }

  const statusFilter = parseOptionalTrimmedString(query.status);
  if (
    statusFilter === 'Reviewing' ||
    statusFilter === 'Verified' ||
    statusFilter === 'Flagged'
  ) {
    const statusMatch: Record<string, unknown> = {};
    applyStatusFilter(statusMatch, statusFilter);
    andParts.push(statusMatch);
  }

  const matchFilter =
    andParts.length === 0
      ? {}
      : andParts.length === 1
        ? andParts[0]!
        : { $and: andParts };

  const exporterQB = new QueryBuilder(
    ExporterProfile.find(matchFilter),
    paginationQuery,
  )
    .sort('-createdAt')
    .paginate({ defaultLimit: 10, maxLimit: 50 });

  const meta = await exporterQB.countTotal();
  const [rawRows, pipelineTotal] = await Promise.all([
    exporterQB.modelQuery
      .select(
        'userId companyName slug companyType companyVerification logoUrl createdAt',
      )
      .populate({ path: 'logoUrl', select: 'url alt' })
      .lean(),
    countPipelineTotal(),
  ]);

  const data = (rawRows as Record<string, unknown>[]).map(shapeRow);
  return { data, meta, pipelineTotal };
};

export const AdminSellerVerificationService = {
  getSellerVerificationForAdminFromDB,
};
