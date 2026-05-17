import { Types } from 'mongoose';
import QueryBuilder from '../../builders/QueryBuilder';
import { Product } from '../product/product.model';

const buildProductListQuery = (
  baseQuery: ReturnType<typeof Product.find>,
  query: Record<string, unknown>,
) =>
  new QueryBuilder(baseQuery, query)
    .search(['productName', 'hsCode', 'slug'])
    .filter()
    .sort()
    .fields(
      'userId productName hsCode categoryId priceRange productImages slug tags status isFeatured views rating totalReviews updatedAt',
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

const shapeProductListData = (products: unknown[]) => {
  return products.map((product) => {
    const raw = product as {
      _id?: Types.ObjectId;
      updatedAt?: Date;
    };
    const id = raw._id ? String(raw._id) : '';

    const productObj = product as {
      userId?: Types.ObjectId;
      productName?: string;
      hsCode?: string;
      categoryId?:
        | { _id?: Types.ObjectId; categoryName?: string }
        | Types.ObjectId;
      priceRange?: { min: number; max: number };
      productImages?: Array<
        { _id?: Types.ObjectId; url?: string } | Types.ObjectId | null
      >;
      slug?: string;
      tags?: Array<string | Types.ObjectId | { _id?: Types.ObjectId }>;
      status?: 'draft' | 'active' | 'inactive';
      isFeatured?: boolean;
      views?: number;
      rating?: number;
      totalReviews?: number;
    };

    const populatedCategory = productObj.categoryId;
    const populatedImages = productObj.productImages;

    const categoryId = populatedCategory
      ? typeof populatedCategory === 'object' && '_id' in populatedCategory
        ? String(populatedCategory._id)
        : String(populatedCategory)
      : '';

    const categoryName =
      populatedCategory &&
      typeof populatedCategory === 'object' &&
      'categoryName' in populatedCategory &&
      typeof populatedCategory.categoryName === 'string'
        ? populatedCategory.categoryName
        : '';

    const productImages = Array.isArray(populatedImages)
      ? populatedImages
          .map((image) => {
            if (!image || typeof image !== 'object' || !('url' in image)) {
              return null;
            }
            const url = (image as { url?: string }).url;
            return typeof url === 'string' && url !== '' ? url : null;
          })
          .filter((u): u is string => u !== null)
      : [];

    const tagIds = Array.isArray(productObj.tags)
      ? productObj.tags.map((t) => {
          if (t && typeof t === 'object' && '_id' in t) {
            return String((t as { _id?: Types.ObjectId })._id);
          }
          return String(t);
        })
      : [];

    return {
      id,
      sellerUserId: productObj.userId ? String(productObj.userId) : '',
      productName: productObj.productName,
      hsCode: productObj.hsCode,
      categoryId,
      categoryName,
      priceRange: productObj.priceRange,
      productImages,
      slug: productObj.slug,
      tags: tagIds,
      status: productObj.status,
      isFeatured: productObj.isFeatured ?? false,
      views: productObj.views ?? 0,
      rating: productObj.rating ?? 0,
      totalReviews: productObj.totalReviews ?? 0,
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : '',
    };
  });
};

/** Product list response aligned with `getAllProductsFromDB`, scoped to saved ids. */
export const fetchSavedProductsList = async (
  productIds: Types.ObjectId[],
  query: Record<string, unknown>,
) => {
  const productQuery = buildProductListQuery(
    Product.find({ _id: { $in: productIds } }),
    mapFlatPriceParamsToRangeFilter(query),
  );

  const meta = await productQuery.countTotal();
  const products = await productQuery.modelQuery
    .populate({
      path: 'categoryId',
      select: 'categoryName slug',
    })
    .populate({
      path: 'productImages',
      select: 'url -_id',
    })
    .lean();

  const data = shapeProductListData(products as unknown[]);

  return { data, meta };
};
