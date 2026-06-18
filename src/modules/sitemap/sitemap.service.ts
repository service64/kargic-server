import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Product } from '../product/product.model';
import type {
  SitemapDetail,
  SitemapListItem,
  SitemapPublicItem,
} from './sitemap.interface';
import { SitemapEntry } from './sitemap.model';
import {
  normalizeSitemapPath,
  toPublicSitemapPath,
} from './sitemap.utils';

const PRODUCT_SITEMAP_PATH_PREFIX = 'products/';
const PRODUCT_SITEMAP_CHANGE_FREQUENCY: SitemapPublicItem['changeFrequency'] =
  'weekly';
const PRODUCT_SITEMAP_PRIORITY = 0.7;

type CreateSitemapPayload = {
  url: string;
  changeFrequency: SitemapListItem['changeFrequency'];
  priority: number;
  lastModified: Date;
  enabled?: boolean;
};

type UpdateSitemapPayload = {
  url?: string;
  changeFrequency?: SitemapListItem['changeFrequency'];
  priority?: number;
  lastModified?: Date;
  enabled?: boolean;
};

const normalizeUrl = normalizeSitemapPath;

const toIso = (value: unknown): string | undefined => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return undefined;
};

const shapeListRow = (row: Record<string, unknown>): SitemapListItem => ({
  _id: row._id ? String(row._id) : '',
  url: String(row.url ?? ''),
  changeFrequency: row.changeFrequency as SitemapListItem['changeFrequency'],
  priority: Number(row.priority ?? 0.5),
  lastModified: toIso(row.lastModified) ?? new Date().toISOString(),
  enabled: Boolean(row.enabled),
  updatedAt: toIso(row.updatedAt),
});

const shapeDetail = (row: Record<string, unknown>): SitemapDetail => ({
  ...shapeListRow(row),
  createdAt: toIso(row.createdAt),
});

const mapStaticSitemapRow = (
  row: Record<string, unknown>,
): SitemapPublicItem => ({
  url: toPublicSitemapPath(String(row.url ?? '')),
  changeFrequency: row.changeFrequency as SitemapPublicItem['changeFrequency'],
  priority: Number(row.priority ?? 0.5),
  lastModified: toIso(row.lastModified) ?? new Date().toISOString(),
});

/** Active products — auto-included in public sitemap (`products/:slug`). */
const getActiveProductSitemapItemsFromDB =
  async (): Promise<SitemapPublicItem[]> => {
    const rows = await Product.find({ status: 'active' })
      .select('slug updatedAt -_id')
      .sort({ slug: 1 })
      .lean();

    return rows
      .filter((row) => typeof row.slug === 'string' && row.slug.trim())
      .map((row) => {
        const updatedAt = (row as { updatedAt?: Date }).updatedAt;
        return {
          url: `${PRODUCT_SITEMAP_PATH_PREFIX}${row.slug}`,
          changeFrequency: PRODUCT_SITEMAP_CHANGE_FREQUENCY,
          priority: PRODUCT_SITEMAP_PRIORITY,
          lastModified: toIso(updatedAt) ?? new Date().toISOString(),
        };
      });
  };

/** Public sitemap feed — enabled rows only, minimal fields, indexed query. */
const getPublicSitemapFromDB = async (): Promise<SitemapPublicItem[]> => {
  const [staticRows, productRows] = await Promise.all([
    SitemapEntry.find({ enabled: true })
      .select('url changeFrequency priority lastModified -_id')
      .sort({ url: 1 })
      .lean(),
    getActiveProductSitemapItemsFromDB(),
  ]);

  const staticItems = staticRows.map((row) =>
    mapStaticSitemapRow(row as unknown as Record<string, unknown>),
  );

  const seen = new Set(staticItems.map((item) => item.url));
  const merged = [...staticItems];

  for (const item of productRows) {
    if (seen.has(item.url)) continue;
    merged.push(item);
    seen.add(item.url);
  }

  return merged.sort((a, b) => a.url.localeCompare(b.url));
};

/** Admin list — all rows. */
const getAllSitemapFromDB = async (): Promise<SitemapListItem[]> => {
  const rows = await SitemapEntry.find()
    .select('_id url changeFrequency priority lastModified enabled updatedAt')
    .sort({ url: 1 })
    .lean();

  return rows.map((row) =>
    shapeListRow(row as unknown as Record<string, unknown>),
  );
};

const getSitemapByIdFromDB = async (id: string): Promise<SitemapDetail> => {
  const doc = await SitemapEntry.findById(id).lean();
  if (!doc) {
    throw new AppError('Sitemap entry not found', httpStatus.NOT_FOUND);
  }
  return shapeDetail(doc as unknown as Record<string, unknown>);
};

const createSitemapIntoDB = async (payload: CreateSitemapPayload) => {
  const url = normalizeUrl(payload.url);
  const exists = await SitemapEntry.exists({ url });
  if (exists) {
    throw new AppError('Sitemap URL already exists', httpStatus.CONFLICT);
  }

  const doc = await SitemapEntry.create({
    url,
    changeFrequency: payload.changeFrequency,
    priority: payload.priority,
    lastModified: payload.lastModified,
    enabled: payload.enabled ?? true,
  });

  return getSitemapByIdFromDB(String(doc._id));
};

const updateSitemapInDB = async (id: string, payload: UpdateSitemapPayload) => {
  const doc = await SitemapEntry.findById(id);
  if (!doc) {
    throw new AppError('Sitemap entry not found', httpStatus.NOT_FOUND);
  }

  if (typeof payload.url === 'string') {
    const url = normalizeUrl(payload.url);
    if (url !== doc.url) {
      const taken = await SitemapEntry.exists({
        _id: { $ne: doc._id },
        url,
      });
      if (taken) {
        throw new AppError('Sitemap URL already exists', httpStatus.CONFLICT);
      }
      doc.url = url;
    }
  }

  if (payload.changeFrequency) doc.changeFrequency = payload.changeFrequency;
  if (typeof payload.priority === 'number') doc.priority = payload.priority;
  if (payload.lastModified) doc.lastModified = payload.lastModified;
  if (typeof payload.enabled === 'boolean') doc.enabled = payload.enabled;

  await doc.save();
  return getSitemapByIdFromDB(String(doc._id));
};

const deleteSitemapFromDB = async (id: string) => {
  const doc = await SitemapEntry.findByIdAndDelete(id).lean();
  if (!doc) {
    throw new AppError('Sitemap entry not found', httpStatus.NOT_FOUND);
  }
  return { deleted: true as const, url: String(doc.url ?? '') };
};

export const SitemapService = {
  getPublicSitemapFromDB,
  getAllSitemapFromDB,
  getSitemapByIdFromDB,
  createSitemapIntoDB,
  updateSitemapInDB,
  deleteSitemapFromDB,
};
