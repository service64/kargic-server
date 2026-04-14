import express from 'express';
import { UserStorageController } from './userStorage.controller';
import {
  createUserStorageZodSchema,
  userStorageIdByUserParamZodSchema,
  updateUserStorageByUserZodSchema,
} from './userStorage.zod'; 
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/create',
  validateRequest(createUserStorageZodSchema),
  UserStorageController.createUserStorage,
);

router.get(
  '/user/:userId',
  validateRequest(userStorageIdByUserParamZodSchema),
  UserStorageController.getUserStorageByUserId,
);

router.patch(
  '/user/:userId',
  validateRequest(updateUserStorageByUserZodSchema),
  UserStorageController.updateUserStorage,
);

export const UserStorageRoutes = router;
