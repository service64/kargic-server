import { z } from 'zod';
import { ADMIN_ROLE_VALUES } from './admin.interface';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const adminRoleEnum = z.enum(ADMIN_ROLE_VALUES as unknown as [string, ...string[]]);

export const createAdminZodSchema = z.object({
  body: z.object({
    userId: objectIdString,
    role: adminRoleEnum,
    profileImage: objectIdString,
    designation: z.string().min(1),
    department: z.string().min(1).optional(),
    nid: objectIdString,
    permissions: z.array(z.string().min(1)),
    joinDate: z.coerce.date(),
    isActive: z.boolean().optional().default(true),
    reportsTo: objectIdString.optional(),
  }),
});

export const adminIdParamZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateAdminZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z
    .object({
      role: adminRoleEnum.optional(),
      profileImage: objectIdString.optional(),
      designation: z.string().min(1).optional(),
      department: z.string().min(1).optional().nullable(),
      nid: objectIdString.optional(),
      permissions: z.array(z.string().min(1)).optional(),
      joinDate: z.coerce.date().optional(),
      isActive: z.boolean().optional(),
      isDeleted: z.boolean().optional(),
      reportsTo: objectIdString.optional().nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
