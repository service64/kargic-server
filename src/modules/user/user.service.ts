import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { IUser } from './user.interface';
import { User } from './user.model';

const createUserIntoDB = async (payload: IUser) => {
  // business rule: email and phone must be unique
  const exists = await User.findOne({
    $or: [{ email: payload.email }, { phone: payload.phone }],
  });
  if (exists) {
    throw new AppError('Email or phone already exists', httpStatus.CONFLICT);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await User.create({
    ...payload,
    otp,
    isVerified: false,
  });

  const userObj = user.toObject();
  if ('password' in userObj) {
    delete (userObj as Partial<typeof userObj>).password;
  }

  return userObj;
};

const verifyOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }

  if (user.otp !== otp) {
    throw new AppError('Invalid OTP', httpStatus.BAD_REQUEST);
  }

  user.isVerified = true;
  user.otp = undefined as any;

  await user.save();

  const userObj = user.toObject();
  if ('password' in userObj) {
    delete (userObj as Partial<typeof userObj>).password;
  }

  return userObj;
};

export const UserService = {
  createUserIntoDB,
  verifyOtp,
};
