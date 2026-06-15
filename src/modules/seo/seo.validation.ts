import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const pageKey = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid page key')
  .refine((s) => !/^[a-fA-F0-9]{24}$/.test(s), {
    message: 'Use page key, not document id',
  });

const seoBodyFields = {
  page: pageKey,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500),
  keywords: z.array(z.string().trim().min(1)).optional(),
  ogTitle: z.string().trim().max(200).optional(),
  ogDescription: z.string().trim().max(500).optional(),
  ogImage: objectIdString.optional(),
};

export const createSeoZodSchema = z.object({
  body: z.object(seoBodyFields),
});

export const seoIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const seoPageParamZodSchema = z.object({
  params: z.object({
    page: pageKey,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateSeoZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      page: pageKey.optional(),
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().min(1).max(500).optional(),
      keywords: z.array(z.string().trim().min(1)).optional().nullable(),
      ogTitle: z.string().trim().max(200).optional().nullable(),
      ogDescription: z.string().trim().max(500).optional().nullable(),
      ogImage: objectIdString.optional().nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
