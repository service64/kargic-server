import express from 'express';
import { UserController } from './user.controller';
import { createUserZodSchema, verifyOtpZodSchema } from './user.zod';
import validateRequest from '../../middlewares/validateRequest';
const router = express.Router();

router.post(
  '/create',
  validateRequest(createUserZodSchema),
  UserController.createUser,
);

router.post(
  '/verify-otp',
  validateRequest(verifyOtpZodSchema),
  UserController.verifyOtp,
);

export const UserRoutes = router;
