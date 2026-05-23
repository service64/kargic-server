import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const peerUserMessagesQueryZodSchema = z.object({
  params: z.object({
    peerUserId: objectIdString,
  }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const myPeersQueryZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const peerUserReadParamsZodSchema = z.object({
  params: z.object({
    peerUserId: objectIdString,
  }),
});

/** Admin: platform-wide or per-user daily unique peer counts. */
export const dailyPeerAnalyticsQueryZodSchema = z.object({
  query: z.object({
    days: z.coerce.number().int().positive().max(90).optional(),
    userId: objectIdString.optional(),
  }),
});
