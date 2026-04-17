import express from 'express';
import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { ProductController } from './product.controller';
import {
  createProductZodSchema,
  productIdParamZodSchema,
  productImageParamZodSchema,
  updateProductZodSchema,
} from './product.validation';

const router = express.Router();

router.post(
  '/create',
  auth(USER_ROLES.EXPORTER, USER_ROLES.ADMIN),
  validateRequest(createProductZodSchema),
  ProductController.createProduct,
);
 
router.get(
  '/get-all',
  ProductController.getAllProducts,
);
router.get(
  '/my-products',
  auth(USER_ROLES.EXPORTER, USER_ROLES.ADMIN),
  ProductController.getMyProducts,
);
//  document kal nissi
router.get(
  '/:id',
  validateRequest(productIdParamZodSchema),
  ProductController.getProductById,
);

router.patch(
  '/:id',
  auth(USER_ROLES.EXPORTER, USER_ROLES.ADMIN),
  validateRequest(updateProductZodSchema),
  ProductController.updateMyProduct,
);

router.delete(
  '/:id',
  auth(USER_ROLES.EXPORTER, USER_ROLES.ADMIN),
  validateRequest(productIdParamZodSchema),
  ProductController.deleteMyProduct,
);

router.delete(
  '/:id/image/:imageId',
  auth(USER_ROLES.EXPORTER, USER_ROLES.ADMIN),
  validateRequest(productImageParamZodSchema),
  ProductController.deleteProductImage,
);

//  get product by userId user id get from jwt token
export const ProductRoutes = router;
