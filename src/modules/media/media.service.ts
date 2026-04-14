import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { FILE_UPLOAD, MEDIA_ERRORS } from '../../constants/media';
import { Image } from './image.model';
import {
  getR2Client,
  getR2BucketName,
  getR2BucketUrl,
  PutObjectCommand,
  DeleteObjectCommand,
} from './r2.client';
import { IImage } from './image.interface';

const generateR2Key = (originalName: string): string => {
  const ext = originalName.split('.').pop() || 'bin';
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `images/${uniqueId}.${ext}`;
};

const uploadToR2 = async (
  buffer: Buffer,
  r2Key: string,
  contentType: string,
): Promise<void> => {
  const client = getR2Client();
  const bucketName = getR2BucketName();

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
};

const saveImageToDb = async (
  name: string,
  url: string,
  r2Key: string,
  size: number,
  alt: string | undefined,
  userId?: string,
): Promise<IImage> => {
  const doc = await Image.create({
    name,
    url,
    r2_key: r2Key,
    size,
    alt: alt ?? '',
    ...(userId && { userId: new Types.ObjectId(userId) }),
  });
  return doc.toObject();
};

const uploadImage = async (
  file: Express.Multer.File,
  alt: string | undefined,
  userId: string,
): Promise<IImage> => {
  if (!file?.buffer) {
    throw new AppError('No file provided', httpStatus.BAD_REQUEST);
  }

  if (file.size > FILE_UPLOAD.MAX_SIZE) {
    throw new AppError(MEDIA_ERRORS.FILE_TOO_LARGE, httpStatus.BAD_REQUEST);
  }

  const allowedTypes = FILE_UPLOAD.ALLOWED_IMAGE_TYPES as readonly string[];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new AppError(MEDIA_ERRORS.UNSUPPORTED_FILE_TYPE, httpStatus.BAD_REQUEST);
  }

  const r2Key = generateR2Key(file.originalname);
  const bucketUrl = getR2BucketUrl().replace(/\/$/, '');
  const url = `${bucketUrl}/${r2Key}`;

  await uploadToR2(file.buffer, r2Key, file.mimetype);
  return saveImageToDb(file.originalname, url, r2Key, file.size, alt, userId);
};

const getAllImages = async (query: Record<string, unknown>) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { alt: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    Image.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    Image.countDocuments(filter).exec(),
  ]);

  return {
    data: data as IImage[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getImageById = async (imageId: string): Promise<IImage> => {
  if (!/^[0-9a-fA-F]{24}$/.test(imageId)) {
    throw new AppError(MEDIA_ERRORS.INVALID_IMAGE_ID, httpStatus.BAD_REQUEST);
  }
  const image = await Image.findById(imageId).lean().exec();
  if (!image) {
    throw new AppError(MEDIA_ERRORS.IMAGE_NOT_FOUND, httpStatus.NOT_FOUND);
  }
  return image as IImage;
};

const deleteImage = async (imageId: string): Promise<void> => {
  if (!/^[0-9a-fA-F]{24}$/.test(imageId)) {
    throw new AppError(MEDIA_ERRORS.INVALID_IMAGE_ID, httpStatus.BAD_REQUEST);
  }

  const image = await Image.findById(imageId).lean().exec();

  if (!image) {
    throw new AppError(MEDIA_ERRORS.IMAGE_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  const client = getR2Client();
  const bucketName = getR2BucketName();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: image.r2_key,
    }),
  );

  await Image.findByIdAndDelete(imageId).exec();
};

const updateImage = async (
  imageId: string,
  file: Express.Multer.File,
  alt: string | undefined,
  userId: string,
): Promise<IImage> => {
  if (!/^[0-9a-fA-F]{24}$/.test(imageId)) {
    throw new AppError(MEDIA_ERRORS.INVALID_IMAGE_ID, httpStatus.BAD_REQUEST);
  }

  if (!file?.buffer) {
    throw new AppError('No file provided', httpStatus.BAD_REQUEST);
  }

  if (file.size > FILE_UPLOAD.MAX_SIZE) {
    throw new AppError(MEDIA_ERRORS.FILE_TOO_LARGE, httpStatus.BAD_REQUEST);
  }

  const allowedTypes = FILE_UPLOAD.ALLOWED_IMAGE_TYPES as readonly string[];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new AppError(MEDIA_ERRORS.UNSUPPORTED_FILE_TYPE, httpStatus.BAD_REQUEST);
  }

  const newR2Key = generateR2Key(file.originalname);
  const bucketUrl = getR2BucketUrl().replace(/\/$/, '');
  const newUrl = `${bucketUrl}/${newR2Key}`;

  await uploadToR2(file.buffer, newR2Key, file.mimetype);

  const oldImage = await Image.findById(imageId).lean().exec();
  if (!oldImage) {
    throw new AppError(MEDIA_ERRORS.IMAGE_NOT_FOUND, httpStatus.NOT_FOUND);
  }
  const oldR2Key = oldImage.r2_key;

  const updated = await Image.findByIdAndUpdate(
    imageId,
    {
      $set: {
        name: file.originalname,
        url: newUrl,
        r2_key: newR2Key,
        size: file.size,
        userId: new Types.ObjectId(userId),
        ...(alt !== undefined && { alt }),
      },
    },
    { new: true },
  )
    .lean()
    .exec();

  if (!updated) {
    throw new AppError(MEDIA_ERRORS.IMAGE_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  const client = getR2Client();
  const bucketName = getR2BucketName();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: oldR2Key,
    }),
  );

  return updated as IImage;
};

const mediaService = {
  uploadImage,
  getAllImages,
  getImageById,
  deleteImage,
  updateImage,
};

export default mediaService;
