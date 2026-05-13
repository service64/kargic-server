import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { UserBlockModel } from './userBlock.model';

const toOid = (id: string) => new Types.ObjectId(id);

/** Either user blocked the other — no chatting in either direction. */
export const canExchangeMessages = async (userIdA: string, userIdB: string): Promise<boolean> => {
  if (userIdA === userIdB) {
    return false;
  }
  const a = toOid(userIdA);
  const b = toOid(userIdB);
  const blocked = await UserBlockModel.exists({
    $or: [
      { blockerId: a, blockedId: b },
      { blockerId: b, blockedId: a },
    ],
  });
  return !blocked;
};

const createBlockInDB = async (blockerId: string, blockedId: string) => {
  if (blockerId === blockedId) {
    throw new AppError('Cannot block yourself', httpStatus.BAD_REQUEST);
  }
  try {
    return await UserBlockModel.create({
      blockerId: toOid(blockerId),
      blockedId: toOid(blockedId),
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      throw new AppError('User is already blocked', httpStatus.CONFLICT);
    }
    throw err;
  }
};

const removeBlockInDB = async (blockerId: string, blockedId: string) => {
  const res = await UserBlockModel.deleteOne({
    blockerId: toOid(blockerId),
    blockedId: toOid(blockedId),
  });
  if (res.deletedCount === 0) {
    throw new AppError('Block not found', httpStatus.NOT_FOUND);
  }
};

const listBlocksByBlockerFromDB = async (blockerId: string) =>
  UserBlockModel.find({ blockerId: toOid(blockerId) })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

export const UserBlockService = {
  canExchangeMessages,
  createBlockInDB,
  removeBlockInDB,
  listBlocksByBlockerFromDB,
};
