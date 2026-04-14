import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { mediaController } from './media.controller';
import { uploadMiddleware } from './multer.config';
import { uploadImageSchema } from './media.validation';

const router = Router();

/** Importers & exporters use media; `ADMIN` can too (matches `user` `activeRole`). */
const mediaAccess = auth('IMPORTER', 'EXPORTER', 'ADMIN');

/** Only platform admin may replace or delete library assets. */
const mediaAdminOnly = auth('ADMIN');

router.post(
  '/',
  mediaAccess,
  uploadMiddleware,
  validateRequest(uploadImageSchema),
  mediaController.upload,
);

router.get('/all', mediaAccess, mediaController.getAllImages);

router.get('/:id', mediaAccess, mediaController.getImageById);

router.patch(
  '/:id',
  mediaAdminOnly,
  uploadMiddleware,
  validateRequest(uploadImageSchema),
  mediaController.update,
);

router.delete('/:id', mediaAdminOnly, mediaController.remove);

export const MediaRoutes = router;
