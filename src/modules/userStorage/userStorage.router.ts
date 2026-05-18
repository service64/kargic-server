import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { UserStorageController } from './userStorage.controller';
import {
  createUserStorageZodSchema,
  listAllUserStorageQuerySchema,
  updateMyUserStorageZodSchema,
} from './userStorage.zod';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/create',
  auth('ADMIN'),
  validateRequest(createUserStorageZodSchema),
  UserStorageController.createUserStorage,
);

router.get(
  '/all',
  auth('ADMIN'),
  validateRequest(listAllUserStorageQuerySchema),
  UserStorageController.listAllUserStorage,
);

router.get('/me', auth(), UserStorageController.getMyUserStorage);

router.patch(
  '/me',
  auth(),
  validateRequest(updateMyUserStorageZodSchema),
  UserStorageController.updateMyUserStorage,
);

export const UserStorageRoutes = router;
