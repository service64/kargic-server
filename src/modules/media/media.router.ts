import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { mediaController } from './media.controller';
import { uploadMiddleware } from './multer.config';
import { uploadImageSchema } from './media.validation';

const router = Router();

/** Logged-in users only; ownership checks happen in service layer. */
const mediaAccess = auth();

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
  mediaAccess,
  uploadMiddleware,
  validateRequest(uploadImageSchema),
  mediaController.update,
);

router.delete('/:id', mediaAccess, mediaController.remove);

export const MediaRoutes = router;
