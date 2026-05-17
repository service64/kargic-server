import { Types } from 'mongoose';
import QueryBuilder from '../../builders/QueryBuilder';
import { ExporterProfile } from '../auth/exporterProfile/exporterProfile.model';

const buildExporterProfileListQuery = (
  baseQuery: ReturnType<typeof ExporterProfile.find>,
  query: Record<string, unknown>,
) =>
  new QueryBuilder(baseQuery, query)
    .search(['companyName', 'slug', 'description', 'mainProducts'])
    .filter()
    .sort('-createdAt')
    .fields(
      '_id companyName slug companyType mainProducts description createdAt userId logoUrl banner0 banner1 banner2',
    )
    .paginate({ defaultLimit: 20, maxLimit: 100 });

export type SavedExporterListItem = {
  _id: string;
  ownerUserId: string;
  companyName: string;
  slug: string;
  companyType: string;
  mainProducts: string[];
  description?: string;
  createdAt?: string;
  logoUrl: { url: string } | null;
  banner0: { url: string } | null;
  banner1: { url: string } | null;
  banner2: { url: string } | null;
  userId: { email?: string; phone?: string };
};

function trimPopulatedImage(img: unknown): { url: string } | null {
  if (img == null || typeof img !== 'object') return null;
  const u = (img as { url?: unknown }).url;
  return typeof u === 'string' && u.length > 0 ? { url: u } : null;
}

function toPublicExporterListRow(doc: Record<string, unknown>): SavedExporterListItem {
  const uid = doc.userId;
  let user: { email?: string; phone?: string } = {};
  let ownerUserId = '';
  if (uid && typeof uid === 'object' && !Array.isArray(uid)) {
    const o = uid as Record<string, unknown>;
    if (o._id != null) ownerUserId = String(o._id);
    if (typeof o.email === 'string') user = { ...user, email: o.email };
    if (typeof o.phone === 'string') user = { ...user, phone: o.phone };
  } else if (uid != null) {
    ownerUserId = String(uid);
  }

  const createdAt = doc.createdAt;
  const createdStr =
    createdAt instanceof Date
      ? createdAt.toISOString()
      : typeof createdAt === 'string'
        ? createdAt
        : undefined;

  return {
    _id: String(doc._id),
    ownerUserId,
    companyName: String(doc.companyName ?? ''),
    slug: String(doc.slug ?? ''),
    companyType: String(doc.companyType ?? ''),
    mainProducts: Array.isArray(doc.mainProducts)
      ? (doc.mainProducts as unknown[]).map((x) => String(x))
      : [],
    description:
      typeof doc.description === 'string' ? doc.description : undefined,
    createdAt: createdStr,
    logoUrl: trimPopulatedImage(doc.logoUrl),
    banner0: trimPopulatedImage(doc.banner0),
    banner1: trimPopulatedImage(doc.banner1),
    banner2: trimPopulatedImage(doc.banner2),
    userId: user,
  };
}

/** Exporter list response aligned with `getAllExporterProfilesFromDB`, scoped to saved user ids. */
export const fetchSavedExportersList = async (
  exporterUserIds: Types.ObjectId[],
  query: Record<string, unknown>,
) => {
  const listQuery = buildExporterProfileListQuery(
    ExporterProfile.find({ userId: { $in: exporterUserIds } }),
    query,
  );
  const meta = await listQuery.countTotal();
  const raw = await listQuery.modelQuery
    .populate('userId', 'email phone')
    .populate('logoUrl', 'url')
    .populate('banner0', 'url')
    .populate('banner1', 'url')
    .populate('banner2', 'url')
    .lean();
  const data = (raw as Record<string, unknown>[]).map(toPublicExporterListRow);
  return { data, meta };
};
