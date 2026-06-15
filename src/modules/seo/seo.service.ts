import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Image } from '../media/image.model';
import type { SeoDetail, SeoListItem } from './seo.interface';
import { SeoMetadata } from './seo.model';

type CreateSeoPayload = {
  page: string;
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
};

type UpdateSeoPayload = {
  page?: string;
  title?: string;
  description?: string;
  keywords?: string[] | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
};

const normalizePage = (page: string) => page.trim().toLowerCase();

const assertOgImageExists = async (imageId: string) => {
  const exists = await Image.exists({ _id: new Types.ObjectId(imageId) });
  if (!exists) {
    throw new AppError('OG image not found', httpStatus.BAD_REQUEST);
  }
};

const shapeOgImageList = (
  raw: unknown,
): SeoListItem['ogImage'] => {
  if (!raw || typeof raw !== 'object' || !('_id' in raw)) return null;
  const img = raw as { _id: Types.ObjectId | string; url?: string; alt?: string };
  const url = typeof img.url === 'string' ? img.url : '';
  if (!url) return null;
  return {
    _id: String(img._id),
    url,
    alt: typeof img.alt === 'string' ? img.alt : undefined,
  };
};

const shapeOgImageDetail = (
  raw: unknown,
): SeoDetail['ogImage'] => {
  if (!raw || typeof raw !== 'object' || !('_id' in raw)) return null;
  const img = raw as {
    _id: Types.ObjectId | string;
    url?: string;
    name?: string;
    alt?: string;
  };
  const url = typeof img.url === 'string' ? img.url : '';
  if (!url) return null;
  return {
    _id: String(img._id),
    url,
    name: typeof img.name === 'string' ? img.name : undefined,
    alt: typeof img.alt === 'string' ? img.alt : undefined,
  };
};

const shapeSeoListRow = (row: Record<string, unknown>): SeoListItem => ({
  _id: row._id ? String(row._id) : '',
  page: String(row.page ?? ''),
  title: String(row.title ?? ''),
  ogImage: shapeOgImageList(row.ogImage),
});

const shapeSeoDetail = (row: Record<string, unknown>): SeoDetail => ({
  _id: row._id ? String(row._id) : '',
  page: String(row.page ?? ''),
  title: String(row.title ?? ''),
  description: String(row.description ?? ''),
  keywords: Array.isArray(row.keywords)
    ? row.keywords.filter((k): k is string => typeof k === 'string')
    : [],
  ogTitle: typeof row.ogTitle === 'string' ? row.ogTitle : undefined,
  ogDescription:
    typeof row.ogDescription === 'string' ? row.ogDescription : undefined,
  ogImage: shapeOgImageDetail(row.ogImage),
  createdAt:
    row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : typeof row.createdAt === 'string'
        ? row.createdAt
        : undefined,
  updatedAt:
    row.updatedAt instanceof Date
      ? row.updatedAt.toISOString()
      : typeof row.updatedAt === 'string'
        ? row.updatedAt
        : undefined,
});

/** Fast list — page, title, populated ogImage only. */
const getAllSeoFromDB = async (): Promise<SeoListItem[]> => {
  const rows = await SeoMetadata.find()
    .select('_id page title ogImage')
    .populate('ogImage', 'url alt')
    .sort({ page: 1 })
    .lean();

  return rows.map((row) =>
    shapeSeoListRow(row as unknown as Record<string, unknown>),
  );
};

/** Full SEO row for one page key — ogImage populated. */
const getSeoByPageFromDB = async (page: string): Promise<SeoDetail> => {
  const doc = await SeoMetadata.findOne({ page: normalizePage(page) })
    .populate('ogImage', '_id url name alt')
    .lean();

  if (!doc) {
    throw new AppError('SEO metadata not found', httpStatus.NOT_FOUND);
  }

  return shapeSeoDetail(doc as unknown as Record<string, unknown>);
};

const createSeoIntoDB = async (payload: CreateSeoPayload) => {
  const page = normalizePage(payload.page);
  const exists = await SeoMetadata.exists({ page });
  if (exists) {
    throw new AppError('SEO page already exists', httpStatus.CONFLICT);
  }

  if (payload.ogImage) {
    await assertOgImageExists(payload.ogImage);
  }

  const doc = await SeoMetadata.create({
    page,
    title: payload.title.trim(),
    description: payload.description.trim(),
    keywords: payload.keywords?.map((k) => k.trim()).filter(Boolean),
    ogTitle: payload.ogTitle?.trim() || undefined,
    ogDescription: payload.ogDescription?.trim() || undefined,
    ogImage: payload.ogImage
      ? new Types.ObjectId(payload.ogImage)
      : undefined,
  });

  return getSeoByPageFromDB(doc.page);
};

const updateSeoInDB = async (id: string, payload: UpdateSeoPayload) => {
  const doc = await SeoMetadata.findById(id);
  if (!doc) {
    throw new AppError('SEO metadata not found', httpStatus.NOT_FOUND);
  }

  if (typeof payload.page === 'string') {
    const page = normalizePage(payload.page);
    if (page !== doc.page) {
      const taken = await SeoMetadata.exists({
        _id: { $ne: doc._id },
        page,
      });
      if (taken) {
        throw new AppError('SEO page already exists', httpStatus.CONFLICT);
      }
      doc.page = page;
    }
  }

  if (typeof payload.title === 'string') doc.title = payload.title.trim();
  if (typeof payload.description === 'string') {
    doc.description = payload.description.trim();
  }

  if (payload.keywords === null) {
    doc.keywords = undefined;
  } else if (Array.isArray(payload.keywords)) {
    doc.keywords = payload.keywords.map((k) => k.trim()).filter(Boolean);
  }

  if (payload.ogTitle === null) doc.ogTitle = undefined;
  else if (typeof payload.ogTitle === 'string') {
    doc.ogTitle = payload.ogTitle.trim() || undefined;
  }

  if (payload.ogDescription === null) doc.ogDescription = undefined;
  else if (typeof payload.ogDescription === 'string') {
    doc.ogDescription = payload.ogDescription.trim() || undefined;
  }

  if (payload.ogImage === null) {
    doc.ogImage = undefined;
  } else if (typeof payload.ogImage === 'string') {
    await assertOgImageExists(payload.ogImage);
    doc.ogImage = new Types.ObjectId(payload.ogImage);
  }

  await doc.save();
  return getSeoByPageFromDB(doc.page);
};

const deleteSeoFromDB = async (id: string) => {
  const doc = await SeoMetadata.findByIdAndDelete(id).lean();
  if (!doc) {
    throw new AppError('SEO metadata not found', httpStatus.NOT_FOUND);
  }
  return { deleted: true as const, page: doc.page };
};

export const SeoService = {
  getAllSeoFromDB,
  getSeoByPageFromDB,
  createSeoIntoDB,
  updateSeoInDB,
  deleteSeoFromDB,
};
