import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Product } from '../product/product.model';
import { SavedProduct } from './savedProduct.model';
import { fetchSavedProductsList } from './savedProductListQuery';

const toOid = (id: string) => new Types.ObjectId(id);

const createSavedProductInDB = async (userId: string, productId: string) => {
  const productExists = await Product.exists({ _id: toOid(productId) });
  if (!productExists) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }

  try {
    const doc = await SavedProduct.create({
      userId: toOid(userId),
      productId: toOid(productId),
    });
    return doc;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      throw new AppError('Product already saved', httpStatus.CONFLICT);
    }
    throw err;
  }
};

const deleteSavedProductInDB = async (userId: string, productId: string) => {
  const res = await SavedProduct.deleteOne({
    userId: toOid(userId),
    productId: toOid(productId),
  });
  if (res.deletedCount === 0) {
    throw new AppError('Saved product not found', httpStatus.NOT_FOUND);
  }
};

const getAllSavedProductsFromDB = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const saves = await SavedProduct.find({ userId: toOid(userId) })
    .select('productId')
    .sort({ createdAt: -1 })
    .lean();

  const productIds = saves.map((s) => s.productId);
  if (productIds.length === 0) {
    return {
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPage: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  return fetchSavedProductsList(productIds, query);
};

export const SavedProductService = {
  createSavedProductInDB,
  deleteSavedProductInDB,
  getAllSavedProductsFromDB,
};
