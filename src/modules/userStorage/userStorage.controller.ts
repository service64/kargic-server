import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { UserStorageService } from './userStorage.service';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';

const createUserStorage = catchAsync(async (req: Request, res: Response) => {
  const result = await UserStorageService.createUserStorageIntoDB(req.body);
  return sendResponse(res, httpStatus.CREATED, 'User storage created successfully', result);
});

const getMyUserStorage = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await UserStorageService.getMyUserStorageFromDB(userId);
  return sendResponse(res, httpStatus.OK, 'User storage retrieved successfully', result);
});

const updateMyUserStorage = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await UserStorageService.updateUserStorageByUserIdInDB(userId, req.body);
  return sendResponse(res, httpStatus.OK, 'User storage updated successfully', result);
});

const listAllUserStorage = catchAsync(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await UserStorageService.listAllUserStorageFromDB(page, limit);
  return sendResponse(res, httpStatus.OK, 'User storage list retrieved successfully', result);
});

export const UserStorageController = {
  createUserStorage,
  getMyUserStorage,
  updateMyUserStorage,
  listAllUserStorage,
};
