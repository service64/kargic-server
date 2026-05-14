import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { UserBlockController } from './userBlock.controller';
import {
  createBlockBodyZodSchema,
  blockedUserIdParamZodSchema,
} from './userBlock.validation';

const router = express.Router();

router.use(auth());

router.post(
  '/',
  validateRequest(createBlockBodyZodSchema),
  UserBlockController.createBlock,
);

router.delete(
  '/:blockedUserId',
  validateRequest(blockedUserIdParamZodSchema),
  UserBlockController.removeBlock,
);

router.get('/', UserBlockController.listMyBlocks);

export const UserBlockRoutes = router;
