import { z } from 'zod';

export const createUserZodSchema = z.object({
  body: z.object({
    role: z.enum(['USER', 'ADMIN']).optional(),
    age: z.number(),
    phone: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

export const verifyOtpZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string(),
  }),
});
