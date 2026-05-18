import { z } from 'zod';
import { PACKAGE_TYPES } from '../../type/common.type';

const objectIdString = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const storageBodySchema = z.object({
  used: z.number().min(0).default(0),
});

const packageEnum = z.enum(PACKAGE_TYPES as unknown as [string, ...string[]]);

const optionalPaymentBodyFields = {
  paymentStatus: z.enum(['PAID', 'UNPAID']).optional(),
  paymentDate: z.coerce.date().optional(),
  paymentAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(['CARD', 'PAYPAL', 'STRIPE']).optional(),
};

export const createUserStorageZodSchema = z.object({
  body: z.object({
    userId: objectIdString,
    package: packageEnum,
    storage: storageBodySchema,
    ...optionalPaymentBodyFields,
  }),
});

const updateUserStorageBodySchema = z
  .object({
    package: packageEnum.optional(),
    storage: z
      .object({
        used: z.number().min(0).optional(),
      })
      .optional(),
    ...optionalPaymentBodyFields,
  })
  .refine(
    (data) =>
      data.package !== undefined ||
      data.storage !== undefined ||
      data.paymentStatus !== undefined ||
      data.paymentDate !== undefined ||
      data.paymentAmount !== undefined ||
      data.paymentMethod !== undefined,
    { message: 'At least one field is required to update' },
  );

export const updateMyUserStorageZodSchema = z.object({
  body: updateUserStorageBodySchema,
  query: z.any().optional(),
});

export const listAllUserStorageQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
