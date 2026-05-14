import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createBlockBodyZodSchema = z.object({
  body: z.object({
    blockedUserId: objectIdString,
  }),
});

export const blockedUserIdParamZodSchema = z.object({
  params: z.object({
    blockedUserId: objectIdString,
  }),
});
