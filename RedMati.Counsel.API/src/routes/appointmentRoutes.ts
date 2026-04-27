import { Router } from 'express';
import { db } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth';
import type { Request } from 'express';

const router = Router();
router.use(requireAuth);

function mapAppointment(a: any) {
  return {
    id: a.id,
    tenantId: a.tenant_id,
    profileId: a.profile_id,
    counsellorId: a.counsellor_id,
    scheduledAt: a.scheduled_at,
    durationMinutes: a.duration_minutes,
    status: a.status,
    profile: a.student_name ? { studentName: a.student_name } : undefined,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

router.get('/', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { counsellorId, from, to } = req.query;

  let query = `
    SELECT a.*, p.student_name
    FROM appointments a
    LEFT JOIN case_profiles p ON a.profile_id = p.id
    WHERE a.tenant_id = ?
  `;
  const params: unknown[] = [user.tenantId];

  if (counsellorId) { query += ' AND a.counsellor_id = ?'; params.push(counsellorId); }
  if (from)         { query += ' AND a.scheduled_at >= ?'; params.push(from); }
  if (to)           { query += ' AND a.scheduled_at <= ?'; params.push(to); }
  query += ' ORDER BY a.scheduled_at ASC';

  const rows = db.prepare(query).all(...params) as any[];
  res.json(rows.map(mapAppointment));
});

router.get('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const row = db.prepare(`
    SELECT a.*, p.student_name
    FROM appointments a
    LEFT JOIN case_profiles p ON a.profile_id = p.id
    WHERE a.id = ? AND a.tenant_id = ?
  `).get(req.params.id, user.tenantId) as any;

  if (!row) { res.status(404).json({ message: 'Not found' }); return; }
  res.json(mapAppointment(row));
});

router.post('/', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { profileId, scheduledAt, durationMinutes } = req.body;

  if (!profileId || !scheduledAt) {
    res.status(400).json({ message: 'profileId and scheduledAt are required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO appointments (tenant_id, profile_id, counsellor_id, scheduled_at, duration_minutes)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.tenantId, profileId, user.userId, scheduledAt, durationMinutes || 60);

  const row = db.prepare(`
    SELECT a.*, p.student_name FROM appointments a
    LEFT JOIN case_profiles p ON a.profile_id = p.id WHERE a.id = ?
  `).get(result.lastInsertRowid) as any;

  res.status(201).json(mapAppointment(row));
});

router.patch('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { status, scheduledAt, durationMinutes } = req.body;

  const fields: string[] = [`updated_at = datetime('now')`];
  const params: unknown[] = [];

  if (status)          { fields.push('status = ?');           params.push(status); }
  if (scheduledAt)     { fields.push('scheduled_at = ?');     params.push(scheduledAt); }
  if (durationMinutes) { fields.push('duration_minutes = ?'); params.push(durationMinutes); }

  db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`)
    .run(...params, req.params.id, user.tenantId);

  const row = db.prepare(`
    SELECT a.*, p.student_name FROM appointments a
    LEFT JOIN case_profiles p ON a.profile_id = p.id WHERE a.id = ?
  `).get(req.params.id) as any;

  res.json(mapAppointment(row));
});

router.delete('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  db.prepare('DELETE FROM appointments WHERE id = ? AND tenant_id = ?').run(req.params.id, user.tenantId);
  res.status(204).end();
});

export default router;
