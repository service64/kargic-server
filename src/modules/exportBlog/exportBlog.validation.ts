import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const seoBodySchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: objectIdString.optional().nullable(),
    keywords: z.array(z.string().trim()).optional(),
  })
  .optional();

export const createExportBlogZodSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    excerpt: z.string().optional(),
    content: z.string().min(1),
    tag: z.string().optional(),
    featuredImage: objectIdString.optional(),
    readTimeMinutes: z.number().int().min(1).optional(),
    isFeatured: z.boolean().optional(),
    seo: seoBodySchema,
    status: z.enum(['draft', 'published']).optional(),
  }),
});

export const exportBlogIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const exportBlogSlugParamZodSchema = z.object({
  params: z.object({
    slug: z.string().min(1),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateExportBlogZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      title: z.string().min(1).optional(),
      excerpt: z.string().optional().nullable(),
      content: z.string().min(1).optional(),
      tag: z.string().optional().nullable(),
      featuredImage: objectIdString.optional().nullable(),
      readTimeMinutes: z.number().int().min(1).optional().nullable(),
      isFeatured: z.boolean().optional(),
      seo: seoBodySchema.nullable(),
      status: z.enum(['draft', 'published']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
