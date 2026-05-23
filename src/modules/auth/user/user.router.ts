import express from 'express';
import { UserController } from './user.controller';
import {
  createUserZodSchema,
  verifyOtpZodSchema,
  loginUserZodSchema,
  logoutUserZodSchema,
  superAdminLoginZodSchema,
  sessionManagementRequestOtpZodSchema,
  sessionManagementVerifyOtpZodSchema,
  forgotPasswordZodSchema,
  resetPasswordZodSchema,
  changePasswordZodSchema,
  softDeleteAccountZodSchema,
  updateProfileZodSchema,
  adminGetUsersQueryZodSchema,
} from './user.zod';
import validateRequest from '../../../middlewares/validateRequest';
import { authSessionManagement } from '../../../middlewares/authSessionManagement.middleware';
import { auth } from '../../../middlewares/auth.middleware';
import { USER_ROLES } from '../../../constants';

const router = express.Router();

router.post(
  '/create',
  validateRequest(createUserZodSchema),
  UserController.createUser,
);

router.get('/profile', auth(), UserController.getProfile);

/** Email/password login for platform users (e.g. importer/exporter); full URL: `/api/v1/user/login`. */
router.post(
  '/login',
  validateRequest(loginUserZodSchema),
  UserController.login,
);

router.post('/role-switch', auth(), UserController.switchRole);

router.patch(
  '/profile',
  auth(),
  validateRequest(updateProfileZodSchema),
  UserController.updateProfile,
);

router.post(
  '/verify-otp',
  validateRequest(verifyOtpZodSchema),
  UserController.verifyOtp,
);

router.post(
  '/logout',
  auth(),
  validateRequest(logoutUserZodSchema),
  UserController.logout,
);

router.post(
  '/sessions/send-otp',
  validateRequest(sessionManagementRequestOtpZodSchema),
  UserController.requestSessionManagementOtp,
);

router.post(
  '/sessions/verify-otp',
  validateRequest(sessionManagementVerifyOtpZodSchema),
  UserController.verifySessionManagementOtp,
);

router.get('/sessions', auth(), UserController.listManagedSessions);

router.delete(
  '/sessions/:sessionId',
  authSessionManagement,
  UserController.deleteManagedSession,
);

router.post(
  '/forgot-password',
  validateRequest(forgotPasswordZodSchema),
  UserController.forgotPassword,
);

router.post(
  '/reset-password',
  validateRequest(resetPasswordZodSchema),
  UserController.resetPassword,
);

router.patch(
  '/password',
  auth(),
  validateRequest(changePasswordZodSchema),
  UserController.changePassword,
);
//  this is only for super admin login
router.post(
  '/super-admin/login',
  validateRequest(superAdminLoginZodSchema),
  UserController.superAdminLogin,
);

router.delete(
  '/account',
  auth(),
  validateRequest(softDeleteAccountZodSchema),
  UserController.softDeleteAccount,
);

/** Admin: paginated user list — filter by name, email, phone. */
router.get(
  '/admin',
  auth(USER_ROLES.ADMIN),
  validateRequest(adminGetUsersQueryZodSchema),
  UserController.getUsersForAdmin,
);

router.get(
  '/site-statistics',
  auth(USER_ROLES.ADMIN),
  UserController.getSiteStatistics,
);

export const UserRoutes = router;
