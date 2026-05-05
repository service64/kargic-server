import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { generateSlug } from '../../utils/generateSlug';
import { Image } from '../media/image.model';
import { ActiveRole } from '../auth/user/user.interface';
import { IBrand } from './brand.interface';
import { Brand } from './brand.model';

type CreatePayload = {
  userId: string;
  brandName: string;
  image: string;
};

const assertImageExists = async (imageId: string) => {
  const image = await Image.findById(imageId).select('_id').lean();
  if (!image) {
    throw new AppError('Image not found', httpStatus.BAD_REQUEST);
  }
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

const createBrandIntoDB = async (payload: CreatePayload) => {
  const brandName = payload.brandName.trim();
  if (!brandName) {
    throw new AppError('Brand name is required', httpStatus.BAD_REQUEST);
  }

  const alreadyHasBrand = await Brand.exists({
    userId: new Types.ObjectId(payload.userId),
  });
  if (alreadyHasBrand) {
    throw new AppError(
      'You already have a brand. Update it instead of creating another.',
      httpStatus.CONFLICT,
    );
  }

  await assertImageExists(payload.image);

  const exists = await Brand.findOne({ brandName }).lean();
  if (exists) {
    throw new AppError('Brand name already exists', httpStatus.CONFLICT);
  }

  const brandData: IBrand = {
    userId: new Types.ObjectId(payload.userId),
    brandName,
    image: new Types.ObjectId(payload.image),
    slug: generateSlug(brandName, 'brand'),
  };

  return Brand.create(brandData);
};

const getMyBrandFromDB = async (userId: string) => {
  return Brand.findOne({ userId: new Types.ObjectId(userId) })
    .populate('image', '_id url name alt')
    .populate('userId', '_id name email')
    .lean();
};

const updateBrandInDB = async (
  id: string,
  userId: string,
  activeRole: ActiveRole,
  body: Record<string, unknown>,
) => {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new AppError('Brand not found', httpStatus.NOT_FOUND);
  }

  assertManagePermission(brand.userId, userId, activeRole);

  if (typeof body.brandName === 'string') {
    const nextName = body.brandName.trim();
    if (!nextName) {
      throw new AppError('Brand name is required', httpStatus.BAD_REQUEST);
    }
    const duplicate = await Brand.findOne({
      _id: { $ne: brand._id },
      brandName: nextName,
    }).lean();
    if (duplicate) {
      throw new AppError('Brand name already exists', httpStatus.CONFLICT);
    }
    brand.brandName = nextName;
    brand.slug = generateSlug(nextName, 'brand');
  }

  if (typeof body.image === 'string') {
    await assertImageExists(body.image);
    brand.image = new Types.ObjectId(body.image);
  }

  await brand.save();
  const updated = await Brand.findById(brand._id)
    .populate('image', '_id url name alt')
    .populate('userId', '_id name email')
    .lean();
  return updated;
};

export const BrandService = {
  createBrandIntoDB,
  getMyBrandFromDB,
  updateBrandInDB,
};
