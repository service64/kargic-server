import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createShippingAddressZodSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).trim(),
    phone: z.string().min(1).trim(),
    addressLine: z.string().min(1).trim(),
    city: z.string().min(1).trim(),
    state: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
    country: z.string().min(1).trim(),
    isDefault: z.boolean().optional(),
  }),
});

export const shippingAddressIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateShippingAddressZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      fullName: z.string().min(1).trim().optional(),
      phone: z.string().min(1).trim().optional(),
      addressLine: z.string().min(1).trim().optional(),
      city: z.string().min(1).trim().optional(),
      state: z.string().trim().optional().nullable(),
      postalCode: z.string().trim().optional().nullable(),
      country: z.string().min(1).trim().optional(),
      isDefault: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
