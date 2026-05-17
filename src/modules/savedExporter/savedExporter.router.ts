import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { SavedExporterController } from './savedExporter.controller';
import {
  createSavedExporterZodSchema,
  savedExporterUserIdParamZodSchema,
} from './savedExporter.validation';

const router = express.Router();

router.use(auth('IMPORTER'));

router.post(
  '/',
  validateRequest(createSavedExporterZodSchema),
  SavedExporterController.createSavedExporter,
);

router.get('/', SavedExporterController.getAllSavedExporters);

router.delete(
  '/:exporterUserId',
  validateRequest(savedExporterUserIdParamZodSchema),
  SavedExporterController.deleteSavedExporter,
);

export const SavedExporterRoutes = router;
