import express from 'express';
import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { ProductController } from './product.controller';
import {
  createProductZodSchema,
  productIdParamZodSchema,
  productSearchQueryZodSchema,
  productSellerUserIdParamZodSchema,
  productSlugParamZodSchema,
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
/** Auth user dashboard products — image, title, price, views count. */
router.get(
  '/dashboard-products',
  auth(USER_ROLES.EXPORTER, USER_ROLES.ADMIN),
  ProductController.getDashboardProducts,
);
/** Active products for a seller: only title, image, priceRange, stock per item. */
router.get(
  '/user/:userId',
  validateRequest(productSellerUserIdParamZodSchema),
  ProductController.getPublicMinimalProductsBySellerUserId,
);
router.get(
  '/search',
  validateRequest(productSearchQueryZodSchema),
  ProductController.searchProducts,
);
router.get(
  '/:slug',
  validateRequest(productSlugParamZodSchema),
  ProductController.getProductBySlug,
);
router.patch(
  '/:id',
  auth(USER_ROLES.EXPORTER, USER_ROLES.ADMIN),
  validateRequest(updateProductZodSchema),
  ProductController.updateMyProduct,
);
router.patch('/:id/views-count', ProductController.updateProductViewsCount);
router.delete(
  '/:id',
  auth(USER_ROLES.EXPORTER, USER_ROLES.ADMIN),
  validateRequest(productIdParamZodSchema),
  ProductController.deleteMyProduct,
);

export const ProductRoutes = router;
