import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { CategoryController } from './category.controller';
import {
  categoryIdParamZodSchema,
  createCategoryZodSchema,
  updateCategoryZodSchema,
} from './category.validation';
import { USER_ROLES } from '../../constants';

const router = express.Router();

router.post(
  '/create',
  auth(USER_ROLES.ADMIN),
  validateRequest(createCategoryZodSchema),
  CategoryController.createCategory,
);

// public routes
router.get('/', CategoryController.getAllCategories);
router.get('/:id', validateRequest(categoryIdParamZodSchema), CategoryController.getCategoryById);

// admin-only routes
router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(updateCategoryZodSchema),
  CategoryController.updateCategory,
);
router.patch(
  '/:id/soft-delete',
  auth(USER_ROLES.ADMIN),
  validateRequest(categoryIdParamZodSchema),
  CategoryController.softDeleteCategory,
);
router.delete(
  '/:id/image',
  auth(USER_ROLES.ADMIN),
  validateRequest(categoryIdParamZodSchema),
  CategoryController.deleteCategoryImage,
);
router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(categoryIdParamZodSchema),
  CategoryController.deleteCategory,
);

export const CategoryRoutes = router;
