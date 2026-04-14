import express from 'express';
import { AdminController } from './admin.controller';
import {
  createAdminZodSchema,
  adminIdParamZodSchema,
  updateAdminZodSchema,
} from './admin.zod';
import validateRequest from '../../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/create',
  validateRequest(createAdminZodSchema),
  AdminController.createAdmin,
);

router.get('/', AdminController.getAllAdmins);

router.get(
  '/:id',
  validateRequest(adminIdParamZodSchema),
  AdminController.getAdminById,
);

router.patch(
  '/:id',
  validateRequest(updateAdminZodSchema),
  AdminController.updateAdmin,
);

router.delete(
  '/:id',
  validateRequest(adminIdParamZodSchema),
  AdminController.removeAdmin,
);

export const AdminRoutes = router;
