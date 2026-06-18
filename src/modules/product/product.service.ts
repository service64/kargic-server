import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Category } from '../category/category.model';
import { Image } from '../media/image.model';
import { IProduct } from './product.interface';
import { Product } from './product.model';
import { ExporterProfile } from '../auth/exporterProfile/exporterProfile.model';
import { User } from '../auth/user/user.model';
import { Brand } from '../brand/brand.model';
import QueryBuilder from '../../builders/QueryBuilder';
import { ActiveRole } from '../auth/user/user.interface';
import {
  DeleteObjectCommand,
  getR2BucketName,
  getR2Client,
} from '../media/r2.client';

type CreatePayload = {
  userId: string;
  productName: string;
  hsCode: string;
  categoryId: string;
  moq?: string;
  priceRange?: { min: number; max: number };
  productionLeadTime?: string;
  supplyCapacity?: string;
  productImages: string[];
  thumbnailImage?: string;
  description?: string;
  shortDescription?: string;
  specifications?: { key: string; value: string }[];
  stock?: number;
  unit?: string;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  originCountry?: string;
  tags?: string[];
  status?: 'draft' | 'active' | 'inactive';
  isFeatured?: boolean;
  seo?: {
    title?: string;
    description?: string;
    image?: string;
    keywords?: string[];
  };
};

const makeSlug = (productName: string, option: string) => {
  const base = `${productName}-${option}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}`;
};

const MAX_PRODUCT_SLUG_LEN = 280;

function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Resolves `slug` collisions (`unique` index). Optionally excludes current doc on update. */
async function allocateUniqueProductSlug(
  baseSlug: string,
  excludeId?: Types.ObjectId,
): Promise<string> {
  const trimmed = baseSlug.trim().slice(0, MAX_PRODUCT_SLUG_LEN);
  const root =
    trimmed || `product-${randomSlugSuffix()}`.slice(0, MAX_PRODUCT_SLUG_LEN);

  let candidate = root;
  for (let i = 0; i < 40; i++) {
    const q: Record<string, unknown> = { slug: candidate };
    if (excludeId) {
      q._id = { $ne: excludeId };
    }
    const taken = await Product.exists(q);
    if (!taken) {
      return candidate;
    }
    const suf = randomSlugSuffix();
    candidate = `${root}-${suf}`.slice(0, MAX_PRODUCT_SLUG_LEN);
  }

  throw new AppError(
    'Could not generate a unique product slug',
    httpStatus.INTERNAL_SERVER_ERROR,
  );
}

const assertCategoryExists = async (categoryId: string) => {
  const category = await Category.findOne({
    _id: new Types.ObjectId(categoryId),
    isDeleted: false,
  }).lean();
  if (!category) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }
};

const assertImagesExist = async (imageIds: string[]) => {
  if (imageIds.length === 0) {
    return;
  }
  const objectIds = imageIds.map((id) => new Types.ObjectId(id));
  const found = await Image.countDocuments({ _id: { $in: objectIds } });
  if (found !== objectIds.length) {
    throw new AppError(
      'One or more product images not found',
      httpStatus.BAD_REQUEST,
    );
  }
};

/** Thumbnail must be one of the product gallery ids; defaults to the first image. */
const resolveThumbnailImageId = (
  productImages: string[],
  thumbnailImage?: string,
): Types.ObjectId | undefined => {
  if (productImages.length === 0) return undefined;

  const pick = thumbnailImage?.trim() || productImages[0];
  if (!productImages.includes(pick)) {
    throw new AppError(
      'Thumbnail must be one of the product images',
      httpStatus.BAD_REQUEST,
    );
  }

  return new Types.ObjectId(pick);
};

const exporterExists = async (userId: string) => {
  const user = await User.findById(new Types.ObjectId(userId));
  if (!user || user.activeRole !== 'EXPORTER' || user?.status !== 'ACTIVE') {
    throw new AppError(
      'User not found or user is diactivated or deleted || contact admin',
      httpStatus.NOT_FOUND,
    );
  }
  const exporter = await ExporterProfile.findOne({
    userId: new Types.ObjectId(userId),
  })
    .select('companyName')
    .lean();
  if (!exporter) {
    throw new AppError('Exporter not found', httpStatus.BAD_REQUEST);
  }

  return exporter;
};

/** One brand per exporter `userId`; used to set `product.brand` automatically. */
const resolveBrandIdForOwner = async (ownerUserId: string | Types.ObjectId) => {
  const doc = await Brand.findOne({
    userId: new Types.ObjectId(String(ownerUserId)),
  })
    .select('_id')
    .lean();
  return doc?._id;
};

const createProductIntoDB = async (payload: CreatePayload) => {
  await assertCategoryExists(payload.categoryId);
  await assertImagesExist(payload.productImages);
  await exporterExists(payload.userId);

  if (payload.seo?.image) {
    await assertImagesExist([payload.seo.image]);
  }

  const imageIds = payload.productImages.map((id) => id.trim()).filter(Boolean);
  if (payload.thumbnailImage) {
    await assertImagesExist([payload.thumbnailImage]);
  }

  const productData: IProduct = {
    userId: new Types.ObjectId(payload.userId),
    productName: payload.productName.trim(),
    hsCode: payload.hsCode.trim(),
    categoryId: new Types.ObjectId(payload.categoryId),
    productImages: imageIds.map((id) => new Types.ObjectId(id)),
    thumbnailImage: resolveThumbnailImageId(imageIds, payload.thumbnailImage),
    slug: await allocateUniqueProductSlug(
      makeSlug(payload.productName, payload.hsCode),
    ),
  };

  if (payload.moq) productData.moq = payload.moq;
  if (payload.priceRange) productData.priceRange = payload.priceRange;
  productData.currency = 'USD';
  if (payload.productionLeadTime)
    productData.productionLeadTime = payload.productionLeadTime;
  if (payload.supplyCapacity)
    productData.supplyCapacity = payload.supplyCapacity;
  if (payload.description) productData.description = payload.description;
  if (payload.shortDescription)
    productData.shortDescription = payload.shortDescription;
  if (payload.specifications)
    productData.specifications = payload.specifications;
  if (payload.stock !== undefined) productData.stock = payload.stock;
  if (payload.unit) productData.unit = payload.unit;
  if (payload.weight !== undefined) productData.weight = payload.weight;
  if (payload.dimensions) productData.dimensions = payload.dimensions;
  if (payload.originCountry) productData.originCountry = payload.originCountry;
  const ownerBrandId = await resolveBrandIdForOwner(payload.userId);
  if (ownerBrandId) productData.brand = ownerBrandId;
  if (payload.tags) {
    productData.tags = payload.tags.map((tagId) => new Types.ObjectId(tagId));
  }
  if (payload.status) productData.status = payload.status;
  if (payload.isFeatured !== undefined)
    productData.isFeatured = payload.isFeatured;
  if (payload.seo) {
    const seoData: NonNullable<IProduct['seo']> = {};
    if (payload.seo.title !== undefined) seoData.title = payload.seo.title;
    if (payload.seo.description !== undefined)
      seoData.description = payload.seo.description;
    if (payload.seo.keywords !== undefined)
      seoData.keywords = payload.seo.keywords;
    if (payload.seo.image !== undefined) {
      seoData.image = new Types.ObjectId(payload.seo.image);
    }
    productData.seo = seoData;
  }

  return Product.create(productData);
};

const assertManagePermission = (
  ownerId: Types.ObjectId,
  userId: string,
  activeRole: ActiveRole,
) => {
  if (activeRole === 'ADMIN') return;
  if (String(ownerId) !== userId) {
    throw new AppError('Forbidden', httpStatus.FORBIDDEN);
  }
};

const getProductByIdFromDB = async (id: string) => {
  const product = await Product.findById(id)
    .populate('categoryId', '_id categoryName slug')
    .populate('productImages', '_id url name alt')
    .populate('thumbnailImage', '_id url name alt')
    .populate('seo.image', '_id url name alt')
    .lean();

  if (!product) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }

  return product;
};

export type ProductSeoDetail = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  image: {
    _id: string;
    url: string;
    name?: string;
    alt?: string;
  } | null;
};

const shapeProductSeoImage = (
  raw: unknown,
): ProductSeoDetail['image'] => {
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

/** Public SEO payload for product detail pages — `seo.image` populated with url. */
const getProductSeoBySlugFromDB = async (slug: string): Promise<ProductSeoDetail> => {
  const normalized = slug.trim().toLowerCase();
  const product = await Product.findOne({ slug: normalized })
    .select('slug productName shortDescription seo thumbnailImage')
    .populate('seo.image', '_id url name alt')
    .populate('thumbnailImage', '_id url name alt')
    .lean();

  if (!product) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }

  const seo = product.seo as Record<string, unknown> | undefined;
  const seoImage = shapeProductSeoImage(seo?.image);
  const fallbackImage = shapeProductSeoImage(product.thumbnailImage);

  const title =
    (typeof seo?.title === 'string' && seo.title.trim()) ||
    String(product.productName ?? '');

  const description =
    (typeof seo?.description === 'string' && seo.description.trim()) ||
    (typeof product.shortDescription === 'string' &&
    product.shortDescription.trim()) ||
    '';

  const keywords = Array.isArray(seo?.keywords)
    ? seo.keywords.filter((k): k is string => typeof k === 'string')
    : [];

  return {
    slug: typeof product.slug === 'string' ? product.slug : normalized,
    title,
    description,
    keywords,
    image: seoImage ?? fallbackImage,
  };
};

const getProductBySlugFromDB = async (slug: string) => {
  const normalized = slug.trim().toLowerCase();
  const product = await Product.findOne({ slug: normalized })
    .populate('categoryId', '_id categoryName slug')
    .populate('productImages', '_id url name alt')
    .populate('thumbnailImage', '_id url name alt')
    .populate('seo.image', '_id url name alt')
    .populate({
      path: 'tags',
      select: '_id name slug',
      match: { isDeleted: { $ne: true } },
    })
    .lean();

  if (!product) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }

  if (Array.isArray(product.tags)) {
    product.tags = product.tags.filter(
      (t): t is NonNullable<(typeof product.tags)[number]> => t != null,
    );
  }

  return product;
};

const updateMyProductInDB = async (
  id: string,
  userId: string,
  activeRole: ActiveRole,
  body: Record<string, unknown>,
) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }

  assertManagePermission(product.userId, userId, activeRole);

  if (typeof body.categoryId === 'string') {
    await assertCategoryExists(body.categoryId);
    product.categoryId = new Types.ObjectId(body.categoryId);
  }

  if (Array.isArray(body.productImages)) {
    const ids = body.productImages as string[];
    await assertImagesExist(ids);
    product.productImages = ids.map((imgId) => new Types.ObjectId(imgId));

    const currentThumb = product.thumbnailImage
      ? String(product.thumbnailImage)
      : '';
    if (body.thumbnailImage === null) {
      product.thumbnailImage = resolveThumbnailImageId(ids);
    } else if (typeof body.thumbnailImage === 'string') {
      await assertImagesExist([body.thumbnailImage]);
      product.thumbnailImage = resolveThumbnailImageId(
        ids,
        body.thumbnailImage,
      );
    } else if (!currentThumb || !ids.includes(currentThumb)) {
      product.thumbnailImage = resolveThumbnailImageId(ids);
    }
  } else if (typeof body.thumbnailImage === 'string') {
    const ids = (product.productImages ?? []).map(String);
    await assertImagesExist([body.thumbnailImage]);
    product.thumbnailImage = resolveThumbnailImageId(
      ids,
      body.thumbnailImage,
    );
  } else if (body.thumbnailImage === null) {
    const ids = (product.productImages ?? []).map(String);
    product.thumbnailImage = resolveThumbnailImageId(ids);
  }

  if (body.productName !== undefined) {
    product.productName = String(body.productName).trim();
  }
  if (body.hsCode !== undefined) {
    product.hsCode = String(body.hsCode).trim();
  }
  if (body.productName !== undefined || body.hsCode !== undefined) {
    product.slug = await allocateUniqueProductSlug(
      makeSlug(product.productName, product.hsCode),
      product._id as Types.ObjectId,
    );
  }

  if (body.moq === null) product.moq = undefined;
  else if (typeof body.moq === 'string') product.moq = body.moq;

  if (body.productionLeadTime === null) product.productionLeadTime = undefined;
  else if (typeof body.productionLeadTime === 'string') {
    product.productionLeadTime = body.productionLeadTime;
  }

  if (body.supplyCapacity === null) product.supplyCapacity = undefined;
  else if (typeof body.supplyCapacity === 'string') {
    product.supplyCapacity = body.supplyCapacity;
  }

  if (body.description === null) product.description = undefined;
  else if (typeof body.description === 'string')
    product.description = body.description;

  if (body.shortDescription === null) product.shortDescription = undefined;
  else if (typeof body.shortDescription === 'string') {
    product.shortDescription = body.shortDescription;
  }

  if (Array.isArray(body.specifications)) {
    product.specifications = body.specifications as IProduct['specifications'];
  }
  if (typeof body.stock === 'number') product.stock = body.stock;
  if (body.unit === null) product.unit = undefined;
  else if (typeof body.unit === 'string') product.unit = body.unit;
  if (typeof body.weight === 'number') product.weight = body.weight;
  if (body.dimensions && typeof body.dimensions === 'object') {
    product.dimensions = body.dimensions as IProduct['dimensions'];
  }
  if (body.originCountry === null) product.originCountry = undefined;
  else if (typeof body.originCountry === 'string')
    product.originCountry = body.originCountry;
  if (Array.isArray(body.tags)) {
    product.tags = (body.tags as string[]).map(
      (tagId) => new Types.ObjectId(tagId),
    );
  }
  if (typeof body.status === 'string')
    product.status = body.status as IProduct['status'];
  if (typeof body.isFeatured === 'boolean')
    product.isFeatured = body.isFeatured;
  if (body.priceRange && typeof body.priceRange === 'object') {
    product.priceRange = body.priceRange as IProduct['priceRange'];
  }

  if (body.seo && typeof body.seo === 'object') {
    const seoInput = body.seo as Record<string, unknown>;
    const seoCurrent = product.seo ?? {};

    if (seoInput.title === null) seoCurrent.title = undefined;
    else if (typeof seoInput.title === 'string')
      seoCurrent.title = seoInput.title;

    if (seoInput.description === null) seoCurrent.description = undefined;
    else if (typeof seoInput.description === 'string') {
      seoCurrent.description = seoInput.description;
    }

    if (seoInput.keywords && Array.isArray(seoInput.keywords)) {
      seoCurrent.keywords = seoInput.keywords as string[];
    }

    if (seoInput.image === null) {
      seoCurrent.image = undefined;
    } else if (typeof seoInput.image === 'string') {
      await assertImagesExist([seoInput.image]);
      seoCurrent.image = new Types.ObjectId(seoInput.image);
    }

    product.seo = seoCurrent;
  }

  const ownerBrandId = await resolveBrandIdForOwner(product.userId);
  if (ownerBrandId) product.brand = ownerBrandId;
  else product.brand = undefined;

  await product.save();

  return getProductByIdFromDB(id);
};

const deleteMyProductFromDB = async (
  id: string,
  userId: string,
  activeRole: ActiveRole,
) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }

  assertManagePermission(product.userId, userId, activeRole);

  const relatedImageIds = new Set<string>();
  for (const imgId of product.productImages ?? []) {
    if (imgId) relatedImageIds.add(String(imgId));
  }
  if (product.seo?.image) {
    relatedImageIds.add(String(product.seo.image));
  }
  if (product.thumbnailImage) {
    relatedImageIds.add(String(product.thumbnailImage));
  }

  await Product.findByIdAndDelete(id);

  // Remove images from storage + Image collection only when orphaned
  const client = getR2Client();
  const bucketName = getR2BucketName();
  for (const imageId of relatedImageIds) {
    const imageObjectId = new Types.ObjectId(imageId);
    const stillUsedInProducts = await Product.exists({
      $or: [
        { productImages: imageObjectId },
        { 'seo.image': imageObjectId },
        { thumbnailImage: imageObjectId },
      ],
    });

    if (stillUsedInProducts) continue;

    const imageDoc = await Image.findById(imageObjectId).lean();
    if (!imageDoc) continue;

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: imageDoc.r2_key,
      }),
    );
    await Image.findByIdAndDelete(imageObjectId);
  }

  return { deleted: true as const };
};


export type PublicProductCardItem = {
  id: string;
  sellerUserId: string;
  productName: string;
  categoryName: string;
  priceRange?: { min: number; max: number };
  thumbnailImageUrl: string | null;
  slug: string;
  status?: 'draft' | 'active' | 'inactive';
  isFeatured: boolean;
};

const shapePublicProductCardData = (
  products: unknown[],
): PublicProductCardItem[] => {
  return products.map((product) => {
    const raw = product as { _id?: Types.ObjectId };
    const productObj = product as {
      userId?: Types.ObjectId;
      productName?: string;
      categoryId?:
        | { _id?: Types.ObjectId; categoryName?: string }
        | Types.ObjectId;
      priceRange?: { min: number; max: number };
      thumbnailImage?: { url?: string } | Types.ObjectId | null;
      slug?: string;
      status?: 'draft' | 'active' | 'inactive';
      isFeatured?: boolean;
    };

    const populatedCategory = productObj.categoryId;
    const categoryName =
      populatedCategory &&
      typeof populatedCategory === 'object' &&
      'categoryName' in populatedCategory &&
      typeof populatedCategory.categoryName === 'string'
        ? populatedCategory.categoryName
        : '';

    const thumb = productObj.thumbnailImage;
    const thumbnailImageUrl =
      thumb &&
      typeof thumb === 'object' &&
      thumb !== null &&
      'url' in thumb &&
      typeof thumb.url === 'string' &&
      thumb.url.length > 0
        ? thumb.url
        : null;

    return {
      id: raw._id ? String(raw._id) : '',
      sellerUserId: productObj.userId ? String(productObj.userId) : '',
      productName: String(productObj.productName ?? ''),
      categoryName,
      priceRange: productObj.priceRange,
      thumbnailImageUrl,
      slug: typeof productObj.slug === 'string' ? productObj.slug : '',
      status: productObj.status,
      isFeatured: productObj.isFeatured ?? false,
    };
  });
};

const shapeMyProductListData = (products: unknown[]) => {
  return products.map((product) => {
    const raw = product as {
      _id?: Types.ObjectId;
      updatedAt?: Date;
    };
    const productObj = product as {
      productName?: string;
      hsCode?: string;
      categoryId?:
        | { _id?: Types.ObjectId; categoryName?: string }
        | Types.ObjectId;
      priceRange?: { min: number; max: number };
      slug?: string;
      status?: 'draft' | 'active' | 'inactive';
    };

    const populatedCategory = productObj.categoryId;
    const categoryName =
      populatedCategory &&
      typeof populatedCategory === 'object' &&
      'categoryName' in populatedCategory &&
      typeof populatedCategory.categoryName === 'string'
        ? populatedCategory.categoryName
        : '';

    return {
      id: raw._id ? String(raw._id) : '',
      productName: productObj.productName,
      hsCode: productObj.hsCode,
      categoryName,
      priceRange: productObj.priceRange,
      slug: productObj.slug,
      status: productObj.status,
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : '',
    };
  });
};

const buildPublicProductListQuery = (
  baseQuery: ReturnType<typeof Product.find>,
  query: Record<string, unknown>,
  extraExcludeFields: string[] = [],
) =>
  new QueryBuilder(baseQuery, query)
    .search(['productName', 'hsCode', 'slug'])
    .filter(extraExcludeFields)
    .sort()
    .fields(
      'userId productName categoryId priceRange thumbnailImage slug status isFeatured',
    )
    .paginate({ defaultLimit: 10, maxLimit: 100 });

const buildProductListQuery = (
  baseQuery: ReturnType<typeof Product.find>,
  query: Record<string, unknown>,
  extraExcludeFields: string[] = [],
) =>
  new QueryBuilder(baseQuery, query)
    .search(['productName', 'hsCode', 'slug'])
    .filter(extraExcludeFields)
    .sort()
    .fields(
      'userId productName hsCode categoryId priceRange slug status updatedAt',
    )
    .paginate({ defaultLimit: 10, maxLimit: 100 });

/** Flat `minPrice` / `maxPrice` → `$expr` overlap on product band [pMin, pMax]. */
function parseFiniteQueryNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    return parseFiniteQueryNumber(value[0]);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function mapFlatPriceParamsToRangeFilter(
  query: Record<string, unknown>,
): Record<string, unknown> {
  const q = { ...query };
  const minPrice = parseFiniteQueryNumber(q.minPrice);
  let maxPrice = parseFiniteQueryNumber(q.maxPrice);
  delete q.minPrice;
  delete q.maxPrice;

  if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) {
    maxPrice = undefined;
  }

  /*
   * Overlap(user band, product band):
   * - Min only (from uMin upward): effective top of band >= uMin → ifNull(p.max, p.min) >= uMin
   * - Max only (up to uMax): floor of band <= uMax → ifNull(p.min, p.max) <= uMax
   * - Both: AND of the two (middle / “center” band)
   */
  const parts: Record<string, unknown>[] = [];

  if (minPrice !== undefined && minPrice >= 0) {
    parts.push({
      $gte: [{ $ifNull: ['$priceRange.max', '$priceRange.min'] }, minPrice],
    });
  }

  if (maxPrice !== undefined && maxPrice >= 0) {
    parts.push({
      $lte: [{ $ifNull: ['$priceRange.min', '$priceRange.max'] }, maxPrice],
    });
  }

  if (parts.length === 1) {
    q.$expr = parts[0];
  } else if (parts.length > 1) {
    q.$expr = { $and: parts };
  }

  return q;
}

const getAllProductsFromDB = async (query: Record<string, unknown>) => {
  const productQuery = buildPublicProductListQuery(
    Product.find(),
    mapFlatPriceParamsToRangeFilter(query),
  );

  const meta = await productQuery.countTotal();
  const products = await productQuery.modelQuery
    .populate({
      path: 'categoryId',
      select: 'categoryName',
    })
    .populate({
      path: 'thumbnailImage',
      select: 'url',
    })
    .lean();

  const data = shapePublicProductCardData(products as unknown[]);

  return { data, meta };
};

export type PublicSellerProductMinimalItem = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  priceRange: { min?: number; max?: number } | null;
  stock: number;
};

export type DashboardProductCardItem = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  priceRange: { min?: number; max?: number } | null;
  viewsCount: number;
};

/** Public: active products for a seller — only title, first image, priceRange, stock. */
const getPublicMinimalProductsBySellerUserIdFromDB = async (userId: string) => {
  const oid = new Types.ObjectId(userId);

  const rows = await Product.find({
    userId: oid,
    status: 'active',
  })
    .select('_id productName priceRange thumbnailImage stock slug')
    .populate('thumbnailImage', 'url')
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  const data: PublicSellerProductMinimalItem[] = (
    rows as unknown as Record<string, unknown>[]
  ).map((p) => {
    const thumb = p.thumbnailImage as { url?: string } | null | undefined;
    const image =
      thumb && typeof thumb === 'object' && typeof thumb.url === 'string'
        ? thumb.url
        : null;
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
        : null;
    const hasBand =
      priceRange &&
      (priceRange.min !== undefined || priceRange.max !== undefined);

    const _id = p._id as Types.ObjectId | string | undefined;
    const id =
      _id !== undefined ? String(_id) : '';

    return {
      id,
      slug: typeof p.slug === 'string' ? p.slug : '',
      title: String(p.productName ?? ''),
      image,
      priceRange: hasBand ? priceRange : null,
      stock: typeof p.stock === 'number' ? p.stock : 0,
    };
  });

  return data;
};

/** Auth user dashboard products — image, title, price, views count. */
const getDashboardProductsFromDB = async (
  userId: string,
): Promise<DashboardProductCardItem[]> => {
  const rows = await Product.find({ userId: new Types.ObjectId(userId) })
    .select('_id productName priceRange thumbnailImage slug viewsCount')
    .populate('thumbnailImage', 'url')
    .sort({ updatedAt: -1 })
    .lean();

  return (rows as unknown as Record<string, unknown>[]).map((p) => {
    const thumb = p.thumbnailImage as { url?: string } | null | undefined;
    const image =
      thumb && typeof thumb === 'object' && typeof thumb.url === 'string'
        ? thumb.url
        : null;

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
        : null;

    const hasBand =
      priceRange &&
      (priceRange.min !== undefined || priceRange.max !== undefined);

    const _id = p._id as Types.ObjectId | string | undefined;
    const id = _id !== undefined ? String(_id) : '';

    return {
      id,
      slug: typeof p.slug === 'string' ? p.slug : '',
      title: String(p.productName ?? ''),
      image,
      priceRange: hasBand ? priceRange : null,
      viewsCount:
        typeof p.viewsCount === 'number' && Number.isFinite(p.viewsCount)
          ? p.viewsCount
          : 0,
    };
  });
};

const getMyProductsFromDB = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const baseQuery = Product.find({ userId: new Types.ObjectId(userId) });
  const productQuery = buildProductListQuery(baseQuery, query, ['userId']);

  const meta = await productQuery.countTotal();
  const products = await productQuery.modelQuery
    .populate({
      path: 'categoryId',
      select: 'categoryName slug',
    })
    .lean();

  const data = shapeMyProductListData(products as unknown[]);

  return { data, meta };
};


const updateProductViewsCountInDB = async (id: string) => {
  const product = await Product.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } }, { new: true });
  return product;
};

const escapeRegexChars = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type ProductSearchSuggestionItem = {
  thumbnailImageUrl: string | null;
  title: string;
  slug: string;
  hsCode?: string;
};

/** Fast autocomplete — active products only, top 10, title or HS code match. */
const searchProductsByTitleFromDB = async (
  query: string,
): Promise<ProductSearchSuggestionItem[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const pattern = new RegExp(escapeRegexChars(trimmed), 'i');

  const rows = await Product.find({
    status: 'active',
    $or: [{ productName: pattern }, { hsCode: pattern }],
  })
    .select('productName slug thumbnailImage hsCode')
    .populate('thumbnailImage', 'url')
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  return (rows as unknown as Record<string, unknown>[]).map((p) => {
    const thumb = p.thumbnailImage as { url?: string } | null | undefined;
    const thumbnailImageUrl =
      thumb && typeof thumb === 'object' && typeof thumb.url === 'string'
        ? thumb.url
        : null;

    const hsCode =
      typeof p.hsCode === 'string' && p.hsCode.trim()
        ? p.hsCode.trim()
        : undefined;

    return {
      thumbnailImageUrl,
      title: String(p.productName ?? ''),
      slug: typeof p.slug === 'string' ? p.slug : '',
      hsCode,
    };
  });
};

export const ProductService = {
  createProductIntoDB,
  getAllProductsFromDB,
  getMyProductsFromDB,
  getPublicMinimalProductsBySellerUserIdFromDB,
  getDashboardProductsFromDB,
  getProductByIdFromDB,
  getProductSeoBySlugFromDB,
  getProductBySlugFromDB,
  updateMyProductInDB,
  deleteMyProductFromDB,
  updateProductViewsCountInDB,
  searchProductsByTitleFromDB,
};
