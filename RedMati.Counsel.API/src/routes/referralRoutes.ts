import { Router } from 'express';
import { db } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth';
import type { Request } from 'express';

const router = Router();
router.use(requireAuth);

function mapReferral(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    studentName: r.student_name,
    schoolYear: r.school_year,
    referrerName: r.referrer_name,
    referrerRole: r.referrer_role,
    reason: r.reason,
    studentConsent: Boolean(r.student_consent),
    status: r.status,
    assignedTo: r.assigned_to,
    assignedToUser: r.assigned_to_full_name
      ? { id: r.assigned_to, fullName: r.assigned_to_full_name, email: r.assigned_to_email }
      : undefined,
    deletedReason: r.deleted_reason,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

router.get('/', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { status } = req.query;

  let query = `
    SELECT r.*, u.full_name AS assigned_to_full_name, u.email AS assigned_to_email
    FROM referrals r
    LEFT JOIN users u ON r.assigned_to = u.id
    WHERE r.tenant_id = ?
  `;
  const params: unknown[] = [user.tenantId];

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }
  query += ' ORDER BY r.created_at DESC';

  const rows = db.prepare(query).all(...params) as any[];
  res.json(rows.map(mapReferral));
});

router.get('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const row = db.prepare(`
    SELECT r.*, u.full_name AS assigned_to_full_name, u.email AS assigned_to_email
    FROM referrals r
    LEFT JOIN users u ON r.assigned_to = u.id
    WHERE r.id = ? AND r.tenant_id = ?
  `).get(req.params.id, user.tenantId) as any;

  if (!row) { res.status(404).json({ message: 'Not found' }); return; }
  res.json(mapReferral(row));
});

router.patch('/:id/assign', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { counsellorId } = req.body as { counsellorId: number | null };
  const newStatus = counsellorId ? 'ASSIGNED' : 'PENDING';

  db.prepare(`UPDATE referrals SET assigned_to = ?, status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`)
    .run(counsellorId ?? null, newStatus, req.params.id, user.tenantId);

  const row = db.prepare(`
    SELECT r.*, u.full_name AS assigned_to_full_name, u.email AS assigned_to_email
    FROM referrals r LEFT JOIN users u ON r.assigned_to = u.id
    WHERE r.id = ? AND r.tenant_id = ?
  `).get(req.params.id, user.tenantId) as any;

  res.json(mapReferral(row));
});

router.delete('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { reason } = req.body as { reason?: string };
  if (!reason) { res.status(400).json({ message: 'Reason is required' }); return; }

  db.prepare(`UPDATE referrals SET status = 'DELETED', deleted_by = ?, deleted_reason = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`)
    .run(user.userId, reason, req.params.id, user.tenantId);

  res.status(204).end();
});

export default router;
