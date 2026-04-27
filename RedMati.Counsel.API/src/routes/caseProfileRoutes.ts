import { Router } from 'express';
import { db } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth';
import type { Request } from 'express';

const router = Router();
router.use(requireAuth);

function mapProfile(p: any, access?: any[]) {
  return {
    id: p.id,
    tenantId: p.tenant_id,
    studentName: p.student_name,
    schoolYear: p.school_year,
    sourceType: p.source_type,
    sourceReferralId: p.source_referral_id,
    ownerId: p.owner_id,
    owner: p.owner_full_name ? { id: p.owner_id, fullName: p.owner_full_name, email: p.owner_email } : undefined,
    status: p.status,
    access: access?.map((a) => ({
      id: a.id,
      profileId: a.profile_id,
      userId: a.user_id,
      user: a.user_full_name ? { id: a.user_id, fullName: a.user_full_name, email: a.user_email } : undefined,
      accessLevel: a.access_level,
      grantedBy: a.granted_by,
      createdAt: a.created_at,
    })),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

router.get('/', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const rows = db.prepare(`
    SELECT p.*, u.full_name AS owner_full_name, u.email AS owner_email
    FROM case_profiles p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.tenant_id = ?
    ORDER BY p.created_at DESC
  `).all(user.tenantId) as any[];

  res.json(rows.map((p) => mapProfile(p)));
});

router.get('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const p = db.prepare(`
    SELECT p.*, u.full_name AS owner_full_name, u.email AS owner_email
    FROM case_profiles p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = ? AND p.tenant_id = ?
  `).get(req.params.id, user.tenantId) as any;

  if (!p) { res.status(404).json({ message: 'Not found' }); return; }

  const access = db.prepare(`
    SELECT a.*, u.full_name AS user_full_name, u.email AS user_email
    FROM case_profile_access a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.profile_id = ?
  `).all(p.id) as any[];

  res.json(mapProfile(p, access));
});

router.post('/', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { studentName, schoolYear, sourceType, sourceReferralId } = req.body;

  if (!studentName || !schoolYear) {
    res.status(400).json({ message: 'studentName and schoolYear are required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO case_profiles (tenant_id, student_name, school_year, source_type, source_referral_id, owner_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.tenantId, studentName, schoolYear, sourceType || 'MANUAL', sourceReferralId || null, user.userId);

  const p = db.prepare(`
    SELECT p.*, u.full_name AS owner_full_name, u.email AS owner_email
    FROM case_profiles p LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(result.lastInsertRowid) as any;

  res.status(201).json(mapProfile(p, []));
});

router.patch('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { status, studentName, schoolYear } = req.body;

  const fields: string[] = [`updated_at = datetime('now')`];
  const params: unknown[] = [];

  if (status) { fields.push('status = ?'); params.push(status); }
  if (studentName) { fields.push('student_name = ?'); params.push(studentName); }
  if (schoolYear) { fields.push('school_year = ?'); params.push(schoolYear); }

  db.prepare(`UPDATE case_profiles SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`)
    .run(...params, req.params.id, user.tenantId);

  const p = db.prepare(`
    SELECT p.*, u.full_name AS owner_full_name, u.email AS owner_email
    FROM case_profiles p LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.params.id) as any;

  const access = db.prepare(`
    SELECT a.*, u.full_name AS user_full_name, u.email AS user_email
    FROM case_profile_access a LEFT JOIN users u ON a.user_id = u.id
    WHERE a.profile_id = ?
  `).all(p.id) as any[];

  res.json(mapProfile(p, access));
});

router.post('/:id/access', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { userId, accessLevel } = req.body;

  const result = db.prepare(`
    INSERT INTO case_profile_access (profile_id, user_id, access_level, granted_by)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, userId, accessLevel, user.userId);

  res.status(201).json({ id: result.lastInsertRowid, profileId: Number(req.params.id), userId, accessLevel, grantedBy: user.userId });
});

router.delete('/:id/access/:userId', (req: Request, res) => {
  db.prepare('DELETE FROM case_profile_access WHERE profile_id = ? AND user_id = ?')
    .run(req.params.id, req.params.userId);
  res.status(204).end();
});

router.delete('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  db.prepare('DELETE FROM case_profiles WHERE id = ? AND tenant_id = ?').run(req.params.id, user.tenantId);
  res.status(204).end();
});

export default router;
