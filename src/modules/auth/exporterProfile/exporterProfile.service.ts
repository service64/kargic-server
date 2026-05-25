import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../../builders/QueryBuilder';
import { ExporterProfile } from './exporterProfile.model';
import { User } from '../user/user.model';
import type { CompanyType, EmployeeCount } from '../../../type/common.type';
import { generateSlug } from '../../../utils/generateSlug';
import { IExporterProfile } from './exporterProfile.interface';
import { Product } from '../../product/product.model';
import { Image } from '../../media/image.model';
import { populateCompanyVerificationImages } from './companyVerification.service';

const MEDIA_REF_SELECT = 'url alt';

async function resolveMediaRef(value: unknown): Promise<unknown> {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null && 'url' in value) {
    return value;
  }
  const id = String(value);
  if (!Types.ObjectId.isValid(id)) return null;
  const img = await Image.findById(id).select(MEDIA_REF_SELECT).lean();
  return img ?? { _id: new Types.ObjectId(id), url: null };
}

/** Admin user-details: logo, banners, and nested verification certificate images. */
export const shapeExporterProfileForAdminDetails = async (
  raw: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> => {
  if (!raw) return null;

  const legacy = raw.bannerUrl;
  const legacyArr = Array.isArray(legacy) ? legacy : null;

  const [logoUrl, banner0, banner1, banner2] = await Promise.all([
    resolveMediaRef(raw.logoUrl),
    resolveMediaRef(raw.banner0 ?? legacyArr?.[0] ?? null),
    resolveMediaRef(raw.banner1 ?? legacyArr?.[1] ?? null),
    resolveMediaRef(raw.banner2 ?? legacyArr?.[2] ?? null),
  ]);

  let companyVerification = raw.companyVerification;
  if (companyVerification && typeof companyVerification === 'object') {
    companyVerification = await populateCompanyVerificationImages(
      JSON.parse(JSON.stringify(companyVerification)) as Record<string, unknown>,
    );
  }

  const { bannerUrl: _legacy, ...rest } = raw;
  return {
    ...rest,
    logoUrl,
    banner0,
    banner1,
    banner2,
    companyVerification,
  };
};

type CreatePayload = {
  userId: string;
  companyName: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string[];
  yearEstablished: string;
  companyType: CompanyType;
  employeeCount: EmployeeCount;
  mainProducts: string[];
  description?: string;
};

const toObjectId = (id: string) => new Types.ObjectId(id);

const createExporterProfileIntoDB = async (payload: CreatePayload) => {
  const user = await User.findById(payload.userId);

  if (!user) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }

  const slug = generateSlug(user.name, payload.companyName);

  // optional unique check (extra safety)
  const existingSlug = await ExporterProfile.findOne({ slug });
  if (existingSlug) {
    throw new AppError('Slug already exists', httpStatus.BAD_REQUEST);
  }

  const exporterData: IExporterProfile = {
    userId: new Types.ObjectId(payload.userId),
    companyName: payload.companyName,
    slug,
    yearEstablished: payload.yearEstablished,
    companyType: payload.companyType,
    employeeCount: payload.employeeCount,
    mainProducts: payload.mainProducts,
  };

  // optional fields clean ভাবে add
  if (payload.logoUrl) {
    exporterData.logoUrl = new Types.ObjectId(payload.logoUrl);
  }

  if (payload.bannerUrl?.length) {
    const b = payload.bannerUrl;
    if (b[0]) exporterData.banner0 = toObjectId(b[0]);
    if (b[1]) exporterData.banner1 = toObjectId(b[1]);
    if (b[2]) exporterData.banner2 = toObjectId(b[2]);
  }

  if (payload.description) {
    exporterData.description = payload.description;
  }

  return ExporterProfile.create(exporterData);
};

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

/** Public list DTO — only fields the storefront exporters directory consumes. */
export type ExporterProfilePublicListItem = {
  _id: string;
  /** Owner `User` id — use for public profile URL `/exporters/:userId`. */
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

function toPublicExporterListRow(
  doc: Record<string, unknown>,
): ExporterProfilePublicListItem {
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

const getAllExporterProfilesFromDB = async (query: Record<string, unknown>) => {
  const listQuery = buildExporterProfileListQuery(ExporterProfile.find(), query);
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

type PublicUserShape = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  activeRole: string;
  isVerified: boolean;
};

type PublicExporterProductRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  priceRange?: { min?: number; max?: number };
  currency: string;
  imageUrl: string | null;
};

function trimPublicUser(u: Record<string, unknown>): PublicUserShape {
  const roles = u.roles;
  const isExporter =
    u.activeRole === 'EXPORTER' ||
    (Array.isArray(roles) && roles.includes('EXPORTER'));
  if (!isExporter) {
    throw new AppError('Not an exporter account', httpStatus.NOT_FOUND);
  }
  if (u.status && u.status !== 'ACTIVE') {
    throw new AppError('User not available', httpStatus.NOT_FOUND);
  }
  return {
    _id: String(u._id),
    name: String(u.name ?? ''),
    email: String(u.email ?? ''),
    phone: String(u.phone ?? ''),
    activeRole: String(u.activeRole ?? ''),
    isVerified: Boolean(u.isVerified),
  };
}

function trimPublicProductRow(p: Record<string, unknown>): PublicExporterProductRow {
  const imgs = p.productImages as unknown[] | undefined;
  let imageUrl: string | null = null;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (first && typeof first === 'object' && first !== null) {
      const url = (first as { url?: string }).url;
      if (typeof url === 'string' && url.length > 0) {
        imageUrl = url;
      }
    }
  }
  const pr = p.priceRange;
  const priceRange =
    pr && typeof pr === 'object' && !Array.isArray(pr)
      ? {
          min:
            typeof (pr as { min?: unknown }).min === 'number'
              ? (pr as { min: number }).min
              : undefined,
          max:
            typeof (pr as { max?: unknown }).max === 'number'
              ? (pr as { max: number }).max
              : undefined,
        }
      : undefined;

  return {
    id: String(p._id),
    slug: String(p.slug ?? ''),
    title: String(p.productName ?? ''),
    shortDescription:
      typeof p.shortDescription === 'string' ? p.shortDescription : undefined,
    priceRange:
      priceRange &&
      (priceRange.min !== undefined || priceRange.max !== undefined)
        ? priceRange
        : undefined,
    currency: typeof p.currency === 'string' ? p.currency : 'USD',
    imageUrl,
  };
}

/** Public storefront: owner user + exporter profile + their active products (card fields). */
const getPublicExporterDetailByUserIdFromDB = async (userId: string) => {
  const oid = new Types.ObjectId(userId);

  const doc = await ExporterProfile.findOne({ userId: oid })
    .populate('userId', 'name email phone activeRole roles isVerified status age')
    .populate('logoUrl', 'url alt')
    .populate('banner0', 'url alt _id')
    .populate('banner1', 'url alt _id')
    .populate('banner2', 'url alt _id');

  if (!doc) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }

  const o = doc.toObject() as unknown as Record<string, unknown> & {
    banner0?: unknown;
    banner1?: unknown;
    banner2?: unknown;
    bannerUrl?: unknown;
    userId?: unknown;
  };

  const rawUser = o.userId;
  if (!rawUser || typeof rawUser !== 'object' || Array.isArray(rawUser)) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }
  const user = trimPublicUser(rawUser as Record<string, unknown>);

  const legacy = o.bannerUrl;
  const legacyArr = Array.isArray(legacy) ? legacy : null;
  const s0 = o.banner0 ?? legacyArr?.[0];
  const s1 = o.banner1 ?? legacyArr?.[1];
  const s2 = o.banner2 ?? legacyArr?.[2];
  const {
    banner0: _b0,
    banner1: _b1,
    banner2: _b2,
    bannerUrl: _legacyField,
    userId: _uidEmbed,
    ...exporterRest
  } = o;

  const exporter = {
    ...exporterRest,
    userId: String(userId),
    bannerUrl: [s0 ?? null, s1 ?? null, s2 ?? null],
  };

  const productsRaw = await Product.find({ userId: oid, status: 'active' })
    .select('productName slug shortDescription priceRange currency productImages')
    .populate('productImages', 'url')
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  const products = (productsRaw as unknown as Record<string, unknown>[]).map(
    trimPublicProductRow,
  );

  return {
    user,
    exporter,
    products,
  };
};

const getExporterProfileByIdFromDB = async (userId: string) => {
  const doc = await ExporterProfile.findOne({
    userId: new Types.ObjectId(userId),
  })
    .populate('userId', 'email phone role name age')
    .populate('logoUrl', 'url alt')
    .populate('banner0', 'url alt _id')
    .populate('banner1', 'url alt _id')
    .populate('banner2', 'url alt _id');
  if (!doc) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }
  const o = doc.toObject() as unknown as Record<string, unknown> & {
    banner0?: unknown;
    banner1?: unknown;
    banner2?: unknown;
    bannerUrl?: unknown;
  };
  const legacy = o.bannerUrl;
  const legacyArr = Array.isArray(legacy) ? legacy : null;
  const s0 = o.banner0 ?? legacyArr?.[0];
  const s1 = o.banner1 ?? legacyArr?.[1];
  const s2 = o.banner2 ?? legacyArr?.[2];
  const { banner0, banner1, banner2, bannerUrl: _legacyField, companyVerification: rawCv, ...rest } = o;

  let companyVerification: unknown = rawCv;
  if (rawCv && typeof rawCv === 'object') {
    companyVerification = await populateCompanyVerificationImages(
      JSON.parse(JSON.stringify(rawCv)) as Record<string, unknown>,
    );
  }

  return {
    ...rest,
    companyVerification,
    bannerUrl: [s0 ?? null, s1 ?? null, s2 ?? null],
  };
};

const updateExporterProfileInDB = async (
  id: string,
  body: Record<string, unknown>,
) => {
  // console.log("body",body);
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};

  if (typeof body.companyName === 'string') {
    $set.companyName = body.companyName;
  }
  if (typeof body.slug === 'string') {
    $set.slug = body.slug;
  }
  if (body.logoUrl === null) {
    $unset.logoUrl = '';
  } else if (typeof body.logoUrl === 'string') {
    $set.logoUrl = toObjectId(body.logoUrl);
  }
  if (body.bannerUrl === null) {
    $unset.banner0 = '';
    $unset.banner1 = '';
    $unset.banner2 = '';
    $unset.bannerUrl = '';
  } else if (
    Array.isArray(body.bannerUrl) &&
    (body.bannerUrl as unknown[]).length === 3
  ) {
    const [a, b, c] = body.bannerUrl as (string | null)[];
    if (a === null) {
      $unset.banner0 = '';
    } else if (typeof a === 'string') {
      $set.banner0 = toObjectId(a);
    }
    if (b === null) {
      $unset.banner1 = '';
    } else if (typeof b === 'string') {
      $set.banner1 = toObjectId(b);
    }
    if (c === null) {
      $unset.banner2 = '';
    } else if (typeof c === 'string') {
      $set.banner2 = toObjectId(c);
    }
    $unset.bannerUrl = '';
  }
  if (
    typeof body.yearEstablished === 'string' &&
    body.yearEstablished.length >= 4
  ) {
    $set.yearEstablished = body.yearEstablished;
  }
  if (typeof body.companyType === 'string') {
    $set.companyType = body.companyType;
  }
  if (typeof body.employeeCount === 'string') {
    $set.employeeCount = body.employeeCount;
  }
  if (Array.isArray(body.mainProducts)) {
    $set.mainProducts = body.mainProducts;
  }
  if (body.description === null) {
    $unset.description = '';
  } else if (typeof body.description === 'string') {
    $set.description = body.description;
  }

  const updateOps: Record<string, unknown> = {};
  if (Object.keys($set).length > 0) {
    updateOps.$set = $set;
  }
  if (Object.keys($unset).length > 0) {
    updateOps.$unset = $unset;
  }

  if (Object.keys(updateOps).length === 0) {
    throw new AppError(
      'At least one field is required to update',
      httpStatus.BAD_REQUEST,
    );
  }

  const doc = await ExporterProfile.findByIdAndUpdate(id, updateOps, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!doc) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const deleteExporterProfileFromDB = async (id: string) => {
  const doc = await ExporterProfile.findByIdAndDelete(id);
  if (!doc) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export const ExporterProfileService = {
  createExporterProfileIntoDB,
  getAllExporterProfilesFromDB,
  getPublicExporterDetailByUserIdFromDB,
  getExporterProfileByIdFromDB,
  updateExporterProfileInDB,
  deleteExporterProfileFromDB,
};
