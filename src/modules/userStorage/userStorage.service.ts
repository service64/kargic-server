import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { UserStorage } from './userStorage.model';
import { User } from '../auth/user/user.model';
import { PackageType } from '../../type/common.type';
import AppError from '../../errors/AppError';

type CreatePayload = {
  userId: string;
  package: PackageType;
  storage: { used: number; limit: number };
};

const toObjectId = (id: string) => new Types.ObjectId(id);

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

  return UserStorage.create({
    userId: toObjectId(payload.userId),
    package: payload.package,
    storage: payload.storage,
  });
};

const getUserStorageByUserIdFromDB = async (userId: string) => {
  const doc = await UserStorage.findOne({
    userId: toObjectId(userId),
  }).populate('userId', 'email phone role');
  if (!doc) {
    throw new AppError('User storage not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const updateUserStorageByUserIdInDB = async (
  userId: string,
  body: Record<string, unknown>,
) => {
  const $set: Record<string, unknown> = {};

  if (typeof body.package === 'string') {
    $set.package = body.package;
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
    if (typeof s.limit === 'number') {
      $set['storage.limit'] = s.limit;
    }
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
    { new: true, runValidators: true },
  ).populate('userId', 'email phone role');

  if (!doc) {
    throw new AppError('User storage not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export const UserStorageService = {
  createUserStorageIntoDB,
  getUserStorageByUserIdFromDB,
  updateUserStorageByUserIdInDB,
};
