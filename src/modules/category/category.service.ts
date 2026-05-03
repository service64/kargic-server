import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { ICategory } from './category.interface';
import { Category } from './category.model';
import { Image } from '../media/image.model';
import { Product } from '../product/product.model';
import {
  DeleteObjectCommand,
  getR2BucketName,
  getR2Client,
} from '../media/r2.client';

type CreatePayload = {
  userId: string;
  categoryName: string;
  description?: string;
  image?: string;
  parentCategory?: string | null;
};

const makeSlug = (value: string) => {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return `${base}`;
};

const createCategoryIntoDB = async (payload: CreatePayload) => {
  const categoryName = payload.categoryName.trim();

  let parentDoc: { _id: Types.ObjectId } | null = null;
  if (payload.parentCategory) {
    parentDoc = await Category.findById(payload.parentCategory)
      .select('_id')
      .lean();
    if (!parentDoc) {
      throw new AppError('Parent category not found', httpStatus.NOT_FOUND);
    }
  }

  if (payload.image) {
    const imageDoc = await Image.findById(payload.image).lean();
    if (!imageDoc) {
      throw new AppError('Image not found', httpStatus.BAD_REQUEST);
    }
  }

  const exists = await Category.findOne({
    categoryName,
    parentCategory: parentDoc ? parentDoc._id : null,
    isDeleted: false,
  });

  if (exists) {
    throw new AppError(
      'Category already exists under this parent',
      httpStatus.CONFLICT,
    );
  }

  const categoryData: ICategory = {
    userId: new Types.ObjectId(payload.userId),
    categoryName,
    slug: makeSlug(categoryName),
    parentCategory: parentDoc ? parentDoc._id : null,
  };

  if (payload.description) {
    categoryData.description = payload.description;
  }

  if (payload.image) {
    categoryData.image = new Types.ObjectId(payload.image);
  }

  return Category.create(categoryData);
};

const getAllCategoriesFromDB = async () => {
  return Category.find({ isDeleted: false })
    .populate('image', 'url name alt')
    .populate('parentCategory', 'categoryName slug level')
    .sort({ createdAt: -1 });
};

const getCategoryByIdFromDB = async (id: string) => {
  const doc = await Category.findOne({ _id: id, isDeleted: false })
    .populate('image', 'url name alt')
    .populate('parentCategory', 'categoryName slug level');
  if (!doc) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const updateCategoryInDB = async (
  id: string,
  body: Record<string, unknown>,
) => {
  const category = await Category.findOne({ _id: id, isDeleted: false });
  if (!category) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }

  if (typeof body.categoryName === 'string') {
    category.categoryName = body.categoryName.trim();
    category.slug = makeSlug(category.categoryName);
  }

  if (body.description === null) {
    category.description = undefined;
  } else if (typeof body.description === 'string') {
    category.description = body.description;
  }

  if (body.image === null) {
    category.image = undefined;
  } else if (typeof body.image === 'string') {
    const imageDoc = await Image.findById(body.image).lean();
    if (!imageDoc) {
      throw new AppError('Image not found', httpStatus.BAD_REQUEST);
    }
    category.image = new Types.ObjectId(body.image);
  }

  if (body.parentCategory === null) {
    category.parentCategory = null;
  } else if (typeof body.parentCategory === 'string') {
    if (body.parentCategory === id) {
      throw new AppError(
        'Category cannot be its own parent',
        httpStatus.BAD_REQUEST,
      );
    }
    const parentDoc = await Category.findOne({
      _id: body.parentCategory,
      isDeleted: false,
    }).lean();
    if (!parentDoc) {
      throw new AppError('Parent category not found', httpStatus.NOT_FOUND);
    }
    category.parentCategory = new Types.ObjectId(body.parentCategory);
  }

  const duplicate = await Category.findOne({
    _id: { $ne: category._id },
    categoryName: category.categoryName,
    parentCategory: category.parentCategory ?? null,
    isDeleted: false,
  }).lean();
  if (duplicate) {
    throw new AppError(
      'Category already exists under this parent',
      httpStatus.CONFLICT,
    );
  }

  await category.save();
  return category;
};

const softDeleteCategoryFromDB = async (id: string) => {
  const hasChildren = await Category.exists({
    parentCategory: new Types.ObjectId(id),
    isDeleted: false,
  });
  if (hasChildren) {
    throw new AppError(
      'Cannot delete category with active subcategories',
      httpStatus.CONFLICT,
    );
  }

  const doc = await Category.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!doc) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const deleteCategoryFromDB = async (id: string) => {
  const hasChildren = await Category.exists({
    parentCategory: new Types.ObjectId(id),
    isDeleted: false,
  });
  if (hasChildren) {
    throw new AppError(
      'Cannot delete category with active subcategories',
      httpStatus.CONFLICT,
    );
  }

  const doc = await Category.findById(id);
  if (!doc) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }

  if (doc.image) {
    const image = await Image.findById(doc.image).lean();
    if (image) {
      const usedByOther = await Category.exists({
        _id: { $ne: doc._id },
        image: image._id,
        isDeleted: false,
      });
      if (usedByOther) {
        throw new AppError(
          'Image is used by another category',
          httpStatus.CONFLICT,
        );
      }

      const usedByProduct = await Product.exists({
        $or: [{ productImages: image._id }, { 'seo.image': image._id }],
      });
      if (usedByProduct) {
        throw new AppError(
          'Image is used by a product; update the product before deleting this category',
          httpStatus.CONFLICT,
        );
      }

      const client = getR2Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: getR2BucketName(),
          Key: image.r2_key,
        }),
      );

      await Image.findByIdAndDelete(image._id);
    }
  }

  const deleted = await Category.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }
  return deleted;
};

const deleteCategoryImageFromStorageAndDB = async (id: string) => {
  const category = await Category.findOne({ _id: id, isDeleted: false });
  if (!category) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }

  if (!category.image) {
    throw new AppError('Category image not found', httpStatus.NOT_FOUND);
  }

  const imageId = category.image.toString();
  const image = await Image.findById(imageId).lean();
  if (!image) {
    category.image = undefined;
    await category.save();
    throw new AppError('Image not found', httpStatus.NOT_FOUND);
  }

  const usedByOther = await Category.exists({
    _id: { $ne: category._id },
    image: image._id,
    isDeleted: false,
  });
  if (usedByOther) {
    throw new AppError(
      'Image is used by another category',
      httpStatus.CONFLICT,
    );
  }

  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: image.r2_key,
    }),
  );

  await Image.findByIdAndDelete(image._id);
  category.image = undefined;
  await category.save();

  return { removed: true as const };
};

export const CategoryService = {
  createCategoryIntoDB,
  getAllCategoriesFromDB,
  getCategoryByIdFromDB,
  updateCategoryInDB,
  softDeleteCategoryFromDB,
  deleteCategoryFromDB,
  deleteCategoryImageFromStorageAndDB,
};
