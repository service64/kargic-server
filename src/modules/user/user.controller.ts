import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { UserService } from './user.service';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.createUserIntoDB(req.body);
  return sendResponse(res, httpStatus.CREATED, 'User created successfully', result);
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await UserService.verifyOtp(email, otp);
  return sendResponse(res, httpStatus.OK, 'User verified successfully', result);
});

export const UserController = {
  createUser,
  verifyOtp,
};
