import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(200),
});

export const twoFactorVerifySchema = z.object({
  challenge_token: z.string().min(1),
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const twoFactorResendSchema = z.object({
  challenge_token: z.string().min(1),
});

export const twoFactorToggleSchema = z.object({
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8).max(200),
});
