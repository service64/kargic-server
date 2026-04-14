import { z } from 'zod';

export const uploadImageSchema = z.object({
  body: z.object({
    alt: z.string().optional().default(''),
  }),
});
