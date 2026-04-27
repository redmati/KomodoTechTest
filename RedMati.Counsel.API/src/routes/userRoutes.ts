import { Router } from 'express';
import { db } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth';
import type { Request } from 'express';

const router = Router();
router.use(requireAuth);

// Returns all active counsellors in the same tenant (excluding the current user)
router.get('/', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const rows = db.prepare(`
    SELECT id, full_name, email, role
    FROM users
    WHERE tenant_id = ? AND is_active = 1 AND id != ?
    ORDER BY full_name ASC
  `).all(user.tenantId, user.userId) as any[];

  res.json(rows.map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
  })));
});

export default router;
