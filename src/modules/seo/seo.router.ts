import express from 'express';
import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { SeoController } from './seo.controller';
import {
  createSeoZodSchema,
  seoIdParamZodSchema,
  seoPageParamZodSchema,
  updateSeoZodSchema,
} from './seo.validation';

const router = express.Router();

/** Public — lean list for site-wide SEO map. */
router.get('/', SeoController.getAllSeo);

/** Public — full SEO for one page key (e.g. home, products). */
router.get(
  '/page/:page',
  validateRequest(seoPageParamZodSchema),
  SeoController.getSeoByPage,
);

router.post(
  '/',
  auth(USER_ROLES.ADMIN),
  validateRequest(createSeoZodSchema),
  SeoController.createSeo,
);

router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(updateSeoZodSchema),
  SeoController.updateSeo,
);

router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(seoIdParamZodSchema),
  SeoController.deleteSeo,
);

export const SeoRoutes = router;
