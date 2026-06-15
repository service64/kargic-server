import { z } from 'zod';
import { SITEMAP_CHANGE_FREQUENCIES } from './sitemap.interface';
import { normalizeSitemapPath } from './sitemap.utils';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const urlPath = z
  .string()
  .transform(normalizeSitemapPath)
  .pipe(
    z
      .string()
      .max(500)
      .refine((s) => !s.includes('://'), {
        message: 'Use a site path, not a full URL',
      }),
  );

const changeFrequency = z.enum(SITEMAP_CHANGE_FREQUENCIES);

const priority = z.coerce.number().min(0).max(1);

const lastModified = z.coerce.date();

const sitemapBodyFields = {
  url: urlPath,
  changeFrequency,
  priority,
  lastModified,
  enabled: z.boolean().optional(),
};

export const createSitemapZodSchema = z.object({
  body: z.object(sitemapBodyFields),
});

export const sitemapIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateSitemapZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      url: urlPath.optional(),
      changeFrequency: changeFrequency.optional(),
      priority: priority.optional(),
      lastModified: lastModified.optional(),
      enabled: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
