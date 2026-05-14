import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserBlockService } from './userBlock.service';

const createBlock = catchAsync(async (req: Request, res: Response) => {
  const { blockedUserId } = req.body as { blockedUserId: string };
  const result = await UserBlockService.createBlockInDB(req.user!.userId, blockedUserId);
  return sendResponse(res, httpStatus.CREATED, 'User blocked', result);
});

const removeBlock = catchAsync(async (req: Request, res: Response) => {
  const blockedUserId = String(req.params.blockedUserId);
  await UserBlockService.removeBlockInDB(req.user!.userId, blockedUserId);
  return sendResponse(res, httpStatus.OK, 'User unblocked', null);
});

const listMyBlocks = catchAsync(async (req: Request, res: Response) => {
  const data = await UserBlockService.listBlocksByBlockerFromDB(req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Block list', data);
});

export const UserBlockController = {
  createBlock,
  removeBlock,
  listMyBlocks,
};
