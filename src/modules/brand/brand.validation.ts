import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createBrandZodSchema = z.object({
  body: z.object({
    brandName: z.string().min(1),
    image: objectIdString,
  }),
});

export const brandIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateBrandZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      brandName: z.string().min(1).optional(),
      image: objectIdString.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
