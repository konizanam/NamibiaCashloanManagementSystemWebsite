import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  twoFactorResendSchema,
  twoFactorToggleSchema,
  twoFactorVerifySchema,
} from '../schemas/auth.js';
import {
  changePassword,
  disableTwoFactor,
  enableTwoFactor,
  getMe,
  login,
  requestPasswordReset,
  resendTwoFactor,
  resetPasswordWithToken,
  verifyTwoFactor,
} from '../services/authService.js';
import { logAudit } from '../lib/audit.js';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await login(email, password);
    if ('requires_2fa' in result) {
      await logAudit({
        action: 'auth.login.challenge_issued',
        metadata: { email_masked: result.email_masked },
        ipAddress: req.ip,
      });
      res.json(result);
      return;
    }
    await logAudit({
      actorId: result.user.id,
      actorRole: result.user.role,
      action: 'auth.login',
      ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/2fa/verify', validate(twoFactorVerifySchema), async (req, res, next) => {
  try {
    const body = req.body as { challenge_token: string; code: string };
    const result = await verifyTwoFactor(body.challenge_token, body.code);
    await logAudit({
      actorId: result.user.id,
      actorRole: result.user.role,
      action: 'auth.login.2fa_verified',
      ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/2fa/resend', validate(twoFactorResendSchema), async (req, res, next) => {
  try {
    const { challenge_token } = req.body as { challenge_token: string };
    const result = await resendTwoFactor(challenge_token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/2fa/enable', requireAuth, validate(twoFactorToggleSchema), async (req, res, next) => {
  try {
    const auth = (req as AuthedRequest).user!;
    const { password } = req.body as { password: string };
    await enableTwoFactor(auth.sub, password);
    await logAudit({
      actorId: auth.sub,
      actorRole: auth.role,
      action: 'auth.2fa_enabled',
      ipAddress: req.ip,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/2fa/disable', requireAuth, validate(twoFactorToggleSchema), async (req, res, next) => {
  try {
    const auth = (req as AuthedRequest).user!;
    const { password } = req.body as { password: string };
    await disableTwoFactor(auth.sub, password);
    await logAudit({
      actorId: auth.sub,
      actorRole: auth.role,
      action: 'auth.2fa_disabled',
      ipAddress: req.ip,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body as { email: string };
    await requestPasswordReset(email);
    await logAudit({
      action: 'auth.forgot_password_requested',
      metadata: { email },
      ipAddress: req.ip,
    });
    // Same response either way — don't reveal whether the email exists.
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const body = req.body as { token: string; new_password: string };
    await resetPasswordWithToken(body.token, body.new_password);
    await logAudit({
      action: 'auth.password_reset',
      ipAddress: req.ip,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const profile = await getMe(user.sub);
    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const body = req.body as { current_password: string; new_password: string };
      await changePassword(auth.sub, body.current_password, body.new_password);
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'auth.change_password',
        ipAddress: req.ip,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
