import express from 'express';
import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { SitemapController } from './sitemap.controller';
import {
  createSitemapZodSchema,
  sitemapIdParamZodSchema,
  updateSitemapZodSchema,
} from './sitemap.validation';

const router = express.Router();

/** Public — lean enabled entries for Next.js sitemap.xml. */
router.get('/public', SitemapController.getPublicSitemap);

router.get('/', auth(USER_ROLES.ADMIN), SitemapController.getAllSitemap);

router.get(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(sitemapIdParamZodSchema),
  SitemapController.getSitemapById,
);

router.post(
  '/',
  auth(USER_ROLES.ADMIN),
  validateRequest(createSitemapZodSchema),
  SitemapController.createSitemap,
);

router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(updateSitemapZodSchema),
  SitemapController.updateSitemap,
);

router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(sitemapIdParamZodSchema),
  SitemapController.deleteSitemap,
);

export const SitemapRoutes = router;
