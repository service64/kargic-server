import { z } from 'zod';
import { CONTACT_USER_TYPES } from './contact.interface';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const contactUserTypeEnum = z.enum(
  CONTACT_USER_TYPES as unknown as [string, ...string[]],
);

export const submitContactZodSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(254),
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(1).max(30),
    userType: contactUserTypeEnum.optional().default('Importer'),
    message: z.string().trim().min(1).max(5000),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

export const adminContactListQueryZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    searchTerm: z.string().trim().optional(),
  }),
  params: z.any().optional(),
  body: z.any().optional(),
});

export const contactIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const adminContactMessagesQueryZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
  body: z.any().optional(),
});

export const markContactMessagesReadZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.object({
    messageIds: z.array(objectIdString).min(1),
  }),
  query: z.any().optional(),
});
