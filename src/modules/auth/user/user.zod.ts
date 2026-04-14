import { z } from 'zod';

const signupActiveRoleEnum = z.enum(['IMPORTER', 'EXPORTER']); 

export const createUserZodSchema = z.object({
  body: z.object({
    activeRole: signupActiveRoleEnum.optional(),
    roles: z.array(signupActiveRoleEnum).optional(),
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

export const loginUserZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    deviceId: z.string().uuid().optional(),
    deviceType: z.string().optional(),
    os: z.string().optional(),
    browser: z.string().optional(),
    timezone: z.string().optional(),
  }),
});

export const logoutUserZodSchema = z.object({
  body: z.object({
    deviceId: z.string().uuid(),
  }),
});

export const superAdminLoginZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const sessionManagementRequestOtpZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const sessionManagementVerifyOtpZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().min(4).max(8),
  }),
});

export const forgotPasswordZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().min(4).max(8),
    newPassword: z.string().min(6),
  }),
});

export const changePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  }),
});

export const softDeleteAccountZodSchema = z.object({
  body: z.object({
    password: z.string().min(1),
  }),
});

const profileUpdateBodySchema = z
  .object({
    phone: z.string().min(1).optional(),
    age: z.number().int().positive().optional(),
    activeRole: signupActiveRoleEnum.optional(),
  })
  .refine(
    (data) =>
      data.phone !== undefined || data.age !== undefined || data.activeRole !== undefined,
    { message: 'At least one of phone, age, activeRole is required' },
  );

export const updateProfileZodSchema = z.object({
  body: profileUpdateBodySchema,
});
