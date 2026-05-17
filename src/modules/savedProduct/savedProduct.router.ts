import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { SavedProductController } from './savedProduct.controller';
import {
  createSavedProductZodSchema,
  savedProductIdParamZodSchema,
} from './savedProduct.validation';

const router = express.Router();

router.use(auth('IMPORTER'));

router.post(
  '/',
  validateRequest(createSavedProductZodSchema),
  SavedProductController.createSavedProduct,
);

router.get('/', SavedProductController.getAllSavedProducts);

router.delete(
  '/:productId',
  validateRequest(savedProductIdParamZodSchema),
  SavedProductController.deleteSavedProduct,
);

export const SavedProductRoutes = router;
