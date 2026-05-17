import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createSavedProductZodSchema = z.object({
  body: z.object({
    productId: objectIdString,
  }),
});

export const savedProductIdParamZodSchema = z.object({
  params: z.object({
    productId: objectIdString,
  }),
});
