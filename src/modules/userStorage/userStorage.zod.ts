import { z } from 'zod'; 
import { PACKAGE_TYPES } from '../../type/common.type';

const objectIdString = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const storageBodySchema = z.object({
  used: z.number().min(0).default(0),
  limit: z.number().min(0),
});

const packageEnum = z.enum(PACKAGE_TYPES as unknown as [string, ...string[]]);

export const createUserStorageZodSchema = z.object({
  body: z.object({
    userId: objectIdString,
    package: packageEnum,
    storage: storageBodySchema,
  }),
});

export const userStorageIdByUserParamZodSchema = z.object({
  params: z.object({
    userId: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateUserStorageByUserZodSchema = z.object({
  params: z.object({
    userId: objectIdString,
  }),
  body: z
    .object({
      package: packageEnum.optional(),
      storage: z
        .object({
          used: z.number().min(0).optional(),
          limit: z.number().min(0).optional(),
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
