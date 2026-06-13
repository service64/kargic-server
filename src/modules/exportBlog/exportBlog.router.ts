import express from 'express';
import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { ExportBlogController } from './exportBlog.controller';
import {
  createExportBlogZodSchema,
  exportBlogIdParamZodSchema,
  exportBlogSlugParamZodSchema,
  updateExportBlogZodSchema,
} from './exportBlog.validation';

const router = express.Router();

router.post(
  '/create',
  auth(USER_ROLES.ADMIN),
  validateRequest(createExportBlogZodSchema),
  ExportBlogController.createExportBlog,
);

router.get(
  '/admin',
  auth(USER_ROLES.ADMIN),
  ExportBlogController.getAllBlogsForAdmin,
);

router.get(
  '/admin/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(exportBlogIdParamZodSchema),
  ExportBlogController.getBlogByIdForAdmin,
);

router.patch(
  '/:id/publish',
  auth(USER_ROLES.ADMIN),
  validateRequest(exportBlogIdParamZodSchema),
  ExportBlogController.publishExportBlog,
);

router.patch(
  '/:id/unpublish',
  auth(USER_ROLES.ADMIN),
  validateRequest(exportBlogIdParamZodSchema),
  ExportBlogController.unpublishExportBlog,
);

router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(updateExportBlogZodSchema),
  ExportBlogController.updateExportBlog,
);

router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(exportBlogIdParamZodSchema),
  ExportBlogController.deleteExportBlog,
);

router.get('/', ExportBlogController.getPublishedBlogs);

router.get(
  '/:slug',
  validateRequest(exportBlogSlugParamZodSchema),
  ExportBlogController.getPublishedBlogBySlug,
);

export const ExportBlogRoutes = router;
