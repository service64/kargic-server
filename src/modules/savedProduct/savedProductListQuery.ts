import { Types } from 'mongoose';
import QueryBuilder from '../../builders/QueryBuilder';
import { Product } from '../product/product.model';

const buildPublicProductListQuery = (
  baseQuery: ReturnType<typeof Product.find>,
  query: Record<string, unknown>,
) =>
  new QueryBuilder(baseQuery, query)
    .search(['productName', 'hsCode', 'slug'])
    .filter()
    .sort()
    .fields(
      'userId productName categoryId priceRange thumbnailImage slug status isFeatured updatedAt',
    )
    .paginate({ defaultLimit: 10, maxLimit: 100 });

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

const shapeSavedProductCardData = (products: unknown[]) => {
  return products.map((product) => {
    const raw = product as {
      _id?: Types.ObjectId;
      updatedAt?: Date;
    };
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
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : '',
    };
  });
};

/** Product list response aligned with `getAllProductsFromDB`, scoped to saved ids. */
export const fetchSavedProductsList = async (
  productIds: Types.ObjectId[],
  query: Record<string, unknown>,
) => {
  const productQuery = buildPublicProductListQuery(
    Product.find({ _id: { $in: productIds } }),
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

  const data = shapeSavedProductCardData(products as unknown[]);

  return { data, meta };
};
