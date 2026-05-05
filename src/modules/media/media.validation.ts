import { z } from 'zod';

/**
 * Validated *after* multer.parse: text parts of multipart bodies arrive as strings.
 * Do not coerce `size` from the form — it is unreliable (empty string → NaN / 0) and
 * the controller uses `file.size` from multer, not `req.body.size`.
 */
export const uploadImageSchema = z.object({
  body: z.object({
    alt: z.string().optional(),
    useCase: z.enum([
      'CATEGORY',
      'LOGO',
      'PRODUCT',
      'USER',
      'BANNER',
      'MESSAGE',
    ]),
  }),
});
