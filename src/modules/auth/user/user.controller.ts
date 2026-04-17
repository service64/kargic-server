import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { UserService } from './user.service';
import sendResponse from '../../../utils/sendResponse';
import catchAsync from '../../../utils/catchAsync';
import { setRefreshTokenCookie } from '../../../utils/refreshTokenCookie';

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.createUserIntoDB(req.body);
  return sendResponse(
    res,
    httpStatus.CREATED,
    'User created successfully',
    result,
  );
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await UserService.verifyOtp(email, otp);
  return sendResponse(res, httpStatus.OK, 'User verified successfully', result);
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password, deviceId, deviceType, os, browser, timezone } = req.body;

  const forwarded = req.headers['x-forwarded-for'];
  const ipFromProxy =
    typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
  const ip = ipFromProxy || req.socket.remoteAddress || '';

  const result = await UserService.loginUser(email, password, {
    deviceId,
    deviceType,
    os,
    browser,
    timezone,
    ip,
    userAgent:
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : '',
  });

  return sendResponse(res, httpStatus.OK, 'Logged in successfully', result);
});

const superAdminLogin = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await UserService.loginSuperAdmin(email, password);
  const { refreshToken, ...data } = result;
  setRefreshTokenCookie(res, refreshToken);
  return sendResponse(res, httpStatus.OK, 'Super admin logged in successfully', data);
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const { deviceId } = req.body;
  await UserService.logoutUser(
    req.user!.userId,
    deviceId,
    req.user!.loginSessionId,
  );
  return sendResponse(res, httpStatus.OK, 'Logged out successfully', { loggedOut: true });
});

const requestSessionManagementOtp = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await UserService.requestSessionManagementOtp(email);
    return sendResponse(res, httpStatus.OK, 'OTP sent to your email', result);
  },
);

const verifySessionManagementOtp = catchAsync(
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await UserService.verifySessionManagementOtpAndListSessions(
      email,
      otp,
    );
    return sendResponse(res, httpStatus.OK, 'Sessions retrieved', result);
  },
);

const deleteManagedSession = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  await UserService.deleteSessionByManagementFlow(
    req.sessionMgmt!.userId,
    sessionId,
  );
  return sendResponse(res, httpStatus.OK, 'Session removed', { removed: true });
});

const listManagedSessions = catchAsync(async (req: Request, res: Response) => {
  const sessions = await UserService.listSessionsForManagementFlow(
    req.user!.userId,
  );
  return sendResponse(res, httpStatus.OK, 'Sessions retrieved', { sessions });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await UserService.requestPasswordResetOtp(email);
  return sendResponse(
    res,
    httpStatus.OK,
    'If an account exists for this email, a reset code has been sent.',
    result,
  );
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const result = await UserService.resetPasswordWithOtp(
    email,
    otp,
    newPassword,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Password reset successfully',
    result,
  );
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const result = await UserService.changePassword(
    req.user!.userId,
    currentPassword,
    newPassword,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Password changed successfully',
    result,
  );
});

const softDeleteAccount = catchAsync(async (req: Request, res: Response) => {
  const { password } = req.body;
  const result = await UserService.softDeleteAccount(
    req.user!.userId,
    password,
  );
  return sendResponse(res, httpStatus.OK, 'Account deleted', result);
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const { name, phone, age, activeRole } = req.body;
  const result = await UserService.updateProfileIntoDB(req.user!.userId, {
    name,
    phone,
    age,
    activeRole,
  });
  return sendResponse(
    res,
    httpStatus.OK,
    'Profile updated successfully',
    result,
  );
});

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getProfileFromDB(req.user!.userId);
  return sendResponse(
    res,
    httpStatus.OK,
    'Profile retrieved successfully',
    result,
  );
});

export const UserController = {
  createUser,
  verifyOtp,
  login,
  superAdminLogin,
  logout,
  requestSessionManagementOtp,
  verifySessionManagementOtp,
  listManagedSessions,
  deleteManagedSession,
  forgotPassword,
  resetPassword,
  changePassword,
  softDeleteAccount,
  getProfile,
  updateProfile,
};
