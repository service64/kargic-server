import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createSavedExporterZodSchema = z.object({
  body: z.object({
    exporterUserId: objectIdString,
  }),
});

export const savedExporterUserIdParamZodSchema = z.object({
  params: z.object({
    exporterUserId: objectIdString,
  }),
});
