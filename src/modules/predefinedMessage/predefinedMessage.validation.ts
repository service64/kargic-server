import { z } from 'zod';
import {
  PREDEFINED_MESSAGE_MAX_LENGTH,
} from './predefinedMessage.constants';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const messageTextSchema = z
  .string()
  .min(1, 'Message is required')
  .max(
    PREDEFINED_MESSAGE_MAX_LENGTH,
    `Message must be at most ${PREDEFINED_MESSAGE_MAX_LENGTH} characters`,
  );

export const createPredefinedMessageZodSchema = z.object({
  body: z.object({
    text: messageTextSchema,
  }),
});

export const predefinedMessageIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updatePredefinedMessageZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.object({
    text: messageTextSchema,
  }),
  query: z.any().optional(),
});
