import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createCategoryZodSchema = z.object({
  body: z.object({
    categoryName: z.string().min(1),
    description: z.string().optional(),
    image: objectIdString.optional(),
    parentCategory: objectIdString.optional().nullable(),
  }),
});

export const categoryIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateCategoryZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      categoryName: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      image: objectIdString.optional().nullable(),
      parentCategory: objectIdString.optional().nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
