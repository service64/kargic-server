import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { UserStorageService } from './userStorage.service';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';

const createUserStorage = catchAsync(async (req: Request, res: Response) => {
  const result = await UserStorageService.createUserStorageIntoDB(req.body);
  return sendResponse(res, httpStatus.CREATED, 'User storage created successfully', result);
});

const getUserStorageByUserId = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = await UserStorageService.getUserStorageByUserIdFromDB(userId);
  return sendResponse(res, httpStatus.OK, 'User storage retrieved successfully', result);
});

const updateUserStorage = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = await UserStorageService.updateUserStorageByUserIdInDB(userId, req.body);
  return sendResponse(res, httpStatus.OK, 'User storage updated successfully', result);
});

export const UserStorageController = {
  createUserStorage,
  getUserStorageByUserId,
  updateUserStorage,
};
