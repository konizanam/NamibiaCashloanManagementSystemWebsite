import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { changePasswordSchema, loginSchema } from '../schemas/auth.js';
import { changePassword, getMe, login } from '../services/authService.js';
import { logAudit } from '../lib/audit.js';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await login(email, password);
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
