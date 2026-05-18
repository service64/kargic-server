import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { UserStorage } from './userStorage.model';
import { User } from '../auth/user/user.model';
import {
  PackageType,
  getStorageLimitMbForPackage,
  PACKAGE_STORAGE_LIMIT_MB,
} from '../../type/common.type';
import AppError from '../../errors/AppError';

type PaymentFields = {
  paymentStatus?: 'PAID' | 'UNPAID';
  /** Raw JSON may send ISO strings; coerced in create/update. */
  paymentDate?: Date | string;
  paymentAmount?: number;
  paymentMethod?: 'CARD' | 'PAYPAL' | 'STRIPE';
};

type CreatePayload = {
  userId: string;
  package: PackageType;
  storage: { used: number };
} & PaymentFields;

const toObjectId = (id: string) => new Types.ObjectId(id);

const parseOptionalBodyDate = (value: unknown): Date | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const createUserStorageIntoDB = async (payload: CreatePayload) => {
  const user = await User.findById(payload.userId);
  if (!user) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }

  const exists = await UserStorage.findOne({
    userId: toObjectId(payload.userId),
  });
  if (exists) {
    throw new AppError(
      'User storage already exists for this user',
      httpStatus.CONFLICT,
    );
  }

  const paymentDate = parseOptionalBodyDate(payload.paymentDate);

  const doc = {
    userId: toObjectId(payload.userId),
    package: payload.package,
    storage: {
      used: payload.storage.used,
      limit: getStorageLimitMbForPackage(payload.package),
    },
    ...(payload.paymentStatus !== undefined && {
      paymentStatus: payload.paymentStatus,
    }),
    ...(paymentDate !== undefined && { paymentDate }),
    ...(payload.paymentAmount !== undefined && {
      paymentAmount: payload.paymentAmount,
    }),
    ...(payload.paymentMethod !== undefined && {
      paymentMethod: payload.paymentMethod,
    }),
  };

  return UserStorage.create(doc);
};

const getUserStorageByUserIdFromDB = async (userId: string) => {
  const doc = await UserStorage.findOne({
    userId: toObjectId(userId),
  }).populate('userId', 'email phone activeRole');
  if (!doc) {
    throw new AppError('User storage not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

/** Ensures a FREE-tier row exists (chat uploads rely on this). */
const getMyUserStorageFromDB = async (userId: string) => {
  await ensureUserStorageRowForChat(userId);
  const doc = await UserStorage.findOne({
    userId: toObjectId(userId),
  }).populate('userId', 'email phone activeRole');
  if (!doc) {
    throw new AppError('User storage not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const listAllUserStorageFromDB = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const filter = {};
  const [raw, total] = await Promise.all([
    UserStorage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email phone activeRole name')
      .lean()
      .exec(),
    UserStorage.countDocuments(filter).exec(),
  ]);
  return {
    data: raw,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const updateUserStorageByUserIdInDB = async (
  userId: string,
  body: Record<string, unknown>,
) => {
  const $set: Record<string, unknown> = {};

  if (typeof body.package === 'string') {
    const pkg = body.package as PackageType;
    $set.package = pkg;
    $set['storage.limit'] = getStorageLimitMbForPackage(pkg);
  }
  if (
    body.storage &&
    typeof body.storage === 'object' &&
    body.storage !== null
  ) {
    const s = body.storage as Record<string, unknown>;
    if (typeof s.used === 'number') {
      $set['storage.used'] = s.used;
    }
  }

  if (body.paymentStatus === 'PAID' || body.paymentStatus === 'UNPAID') {
    $set.paymentStatus = body.paymentStatus;
  }
  const paymentDate = parseOptionalBodyDate(body.paymentDate);
  if (paymentDate !== undefined) {
    $set.paymentDate = paymentDate;
  }
  if (typeof body.paymentAmount === 'number') {
    $set.paymentAmount = body.paymentAmount;
  }
  if (
    body.paymentMethod === 'CARD' ||
    body.paymentMethod === 'PAYPAL' ||
    body.paymentMethod === 'STRIPE'
  ) {
    $set.paymentMethod = body.paymentMethod;
  }

  if (Object.keys($set).length === 0) {
    throw new AppError(
      'At least one field is required to update',
      httpStatus.BAD_REQUEST,
    );
  }

  const doc = await UserStorage.findOneAndUpdate(
    { userId: toObjectId(userId) },
    { $set },
    { returnDocument: 'after', runValidators: true },
  ).populate('userId', 'email phone activeRole');

  if (!doc) {
    throw new AppError('User storage not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

/** `storage.used` / `storage.limit` on the model are treated as MB for chat media quota. */
const MB = 1024 * 1024;

const fileSizeBytesToTrackedMB = (fileSizeBytes: number) =>
  Math.round((fileSizeBytes / MB) * 1e6) / 1e6;

const ensureUserStorageRowForChat = async (userId: string) => {
  await UserStorage.findOneAndUpdate(
    { userId: toObjectId(userId) },
    {
      $setOnInsert: {
        userId: toObjectId(userId),
        package: 'FREE',
        storage: {
          used: 0,
          limit: PACKAGE_STORAGE_LIMIT_MB.FREE,
        },
      },
    },
    { upsert: true },
  );
};

/**
 * After a chat image is stored in R2 + Image collection, atomically adds file size to `storage.used`.
 * Throws if the user would exceed `storage.limit` (upgrade subscription / raise limit).
 */
const applyChatMediaStorageAfterUpload = async (
  userId: string,
  fileSizeBytes: number,
): Promise<void> => {
  const deltaMB = fileSizeBytesToTrackedMB(fileSizeBytes);
  if (deltaMB <= 0) {
    return;
  }
  await ensureUserStorageRowForChat(userId);
  const updated = await UserStorage.findOneAndUpdate(
    {
      userId: toObjectId(userId),
      $expr: {
        $lte: [{ $add: ['$storage.used', deltaMB] }, '$storage.limit'],
      },
    },
    { $inc: { 'storage.used': deltaMB } },
    { returnDocument: 'after', runValidators: true },
  ).exec();

  if (!updated) {
    throw new AppError(
      'Chat media storage limit reached. Upgrade your subscription to increase storage.',
      httpStatus.FORBIDDEN,
    );
  }
};

export const UserStorageService = {
  createUserStorageIntoDB,
  getUserStorageByUserIdFromDB,
  getMyUserStorageFromDB,
  listAllUserStorageFromDB,
  updateUserStorageByUserIdInDB,
  applyChatMediaStorageAfterUpload,
};
