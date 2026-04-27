import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { signAccessToken } from '../auth';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const accessToken = signAccessToken({
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
  });

  res.json({
    tokens: {
      accessToken,
      refreshToken: accessToken, // dev stub — same token used for both
    },
    user: {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: Boolean(user.is_active),
      createdAt: user.created_at,
    },
  });
});

router.post('/logout', (_req, res) => {
  res.status(204).end();
});

export default router;
