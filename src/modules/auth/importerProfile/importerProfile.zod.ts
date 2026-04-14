import { z } from 'zod';

const objectIdString = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createImporterProfileZodSchema = z.object({
  body: z.object({
    userId: objectIdString,
    companyName: z.string().min(1),
    importLicense: z.string().min(1),
    businessType: z.string().min(1),
    country: z.string().min(1),
  }),
});

export const importerProfileIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateImporterProfileZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      companyName: z.string().min(1).optional(),
      importLicense: z.string().min(1).optional(),
      businessType: z.string().min(1).optional(),
      country: z.string().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
