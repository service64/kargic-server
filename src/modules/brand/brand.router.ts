import express from 'express';
import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { BrandController } from './brand.controller';
import {
  brandIdParamZodSchema,
  createBrandZodSchema,
  updateBrandZodSchema,
} from './brand.validation';

const router = express.Router();

router.get(
  '/me',
  auth(USER_ROLES.ADMIN, USER_ROLES.IMPORTER, USER_ROLES.EXPORTER),
  BrandController.getMyBrand,
);

router.post(
  '/create',
  auth(USER_ROLES.ADMIN, USER_ROLES.IMPORTER, USER_ROLES.EXPORTER),
  validateRequest(createBrandZodSchema),
  BrandController.createBrand,
);

router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.IMPORTER, USER_ROLES.EXPORTER),
  validateRequest(updateBrandZodSchema),
  BrandController.updateBrand,
);

export const BrandRoutes = router;
