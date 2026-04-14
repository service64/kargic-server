import multer from 'multer';
import { Request, RequestHandler } from 'express';
import { FILE_UPLOAD } from '../../constants/media';

const storage = multer.memoryStorage();

const allowedTypes = FILE_UPLOAD.ALLOWED_IMAGE_TYPES as readonly string[];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: FILE_UPLOAD.MAX_SIZE },
  fileFilter,
});

export const uploadMiddleware: RequestHandler = upload.single('image');
