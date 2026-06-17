import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const specificationSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

const priceRangeSchema = z
  .object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  })
  .refine((value) => value.max >= value.min, {
    message: 'priceRange.max must be greater than or equal to priceRange.min',
  });

export const createProductZodSchema = z.object({
  body: z.object({
    productName: z.string().min(1),
    hsCode: z.string().min(1),
    categoryId: objectIdString,
    moq: z.string().optional(),
    priceRange: priceRangeSchema.optional(),
    productionLeadTime: z.string().optional(),
    supplyCapacity: z.string().optional(),
    productImages: z.array(objectIdString).min(1),
    thumbnailImage: objectIdString.optional(),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    specifications: z.array(specificationSchema).optional(),
    stock: z.number().int().nonnegative().optional(),
    unit: z.string().optional(),
    weight: z.number().nonnegative().optional(),
    dimensions: z
      .object({
        length: z.number().nonnegative(),
        width: z.number().nonnegative(),
        height: z.number().nonnegative(),
      })
      .optional(),
    originCountry: z.string().optional(),
    tags: z.array(objectIdString).optional(),
    status: z.enum(['draft', 'active', 'inactive']).optional(),
    isFeatured: z.boolean().optional(),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        image: objectIdString.optional(),
        keywords: z.array(z.string().min(1)).optional(),
      })
      .optional(),
  }),
});

export const productIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

/** Public list: products for a seller `User` id. */
export const productSellerUserIdParamZodSchema = z.object({
  params: z.object({
    userId: objectIdString,
  }),
  query: z.any().optional(),
});

/** Hero / autocomplete: `GET /search?q=...` — min 3 chars, title or HS code match, top 10. */
export const productSearchQueryZodSchema = z.object({
  query: z.object({
    q: z
      .string()
      .trim()
      .min(3, 'Search query must be at least 3 characters')
      .max(100),
  }),
  body: z.any().optional(),
});

/** Public detail route: `GET /:slug` (not Mongo `_id`). */
export const productSlugParamZodSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(280)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug')
      .refine((s) => !/^[a-fA-F0-9]{24}$/.test(s), {
        message: 'Use product slug, not document id',
      }),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateProductZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      productName: z.string().min(1).optional(),
      hsCode: z.string().min(1).optional(),
      categoryId: objectIdString.optional(),
      moq: z.string().optional().nullable(),
      priceRange: priceRangeSchema.optional(),
      productionLeadTime: z.string().optional().nullable(),
      supplyCapacity: z.string().optional().nullable(),
      productImages: z.array(objectIdString).min(1).optional(),
      thumbnailImage: objectIdString.optional().nullable(),
      description: z.string().optional().nullable(),
      shortDescription: z.string().optional().nullable(),
      specifications: z.array(specificationSchema).optional(),
      stock: z.number().int().nonnegative().optional(),
      unit: z.string().optional().nullable(),
      weight: z.number().nonnegative().optional(),
      dimensions: z
        .object({
          length: z.number().nonnegative(),
          width: z.number().nonnegative(),
          height: z.number().nonnegative(),
        })
        .optional(),
      originCountry: z.string().optional().nullable(),
      tags: z.array(objectIdString).optional(),
      status: z.enum(['draft', 'active', 'inactive']).optional(),
      isFeatured: z.boolean().optional(),
      seo: z
        .object({
          title: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          image: objectIdString.optional().nullable(),
          keywords: z.array(z.string().min(1)).optional(),
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
