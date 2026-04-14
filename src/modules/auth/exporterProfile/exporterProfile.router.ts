import express from 'express';
import { ExporterProfileController } from './exporterProfile.controller';
import {
  createExporterProfileZodSchema,
  exporterProfileIdParamZodSchema,
  updateExporterProfileZodSchema,
} from './exporterProfile.zod';
import validateRequest from '../../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/create',
  validateRequest(createExporterProfileZodSchema),
  ExporterProfileController.createExporterProfile,
);

router.get('/', ExporterProfileController.getAllExporterProfiles);

router.get(
  '/:id',
  validateRequest(exporterProfileIdParamZodSchema),
  ExporterProfileController.getExporterProfileById,
);

router.patch(
  '/:id',
  validateRequest(updateExporterProfileZodSchema),
  ExporterProfileController.updateExporterProfile,
);

router.delete(
  '/:id',
  validateRequest(exporterProfileIdParamZodSchema),
  ExporterProfileController.deleteExporterProfile,
);

export const ExporterProfileRoutes = router;
