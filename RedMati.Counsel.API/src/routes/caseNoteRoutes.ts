import { Router } from 'express';
import { db } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth';
import type { Request } from 'express';

const router = Router();
router.use(requireAuth);

function mapNote(n: any) {
  return {
    id: n.id,
    tenantId: n.tenant_id,
    profileId: n.profile_id,
    appointmentId: n.appointment_id,
    authorId: n.author_id,
    author: n.author_full_name ? { id: n.author_id, fullName: n.author_full_name, email: n.author_email } : undefined,
    profile: n.student_name ? { studentName: n.student_name } : undefined,
    content: n.content,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

router.get('/', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { profileId } = req.query;

  let query = `
    SELECT n.*, u.full_name AS author_full_name, u.email AS author_email, p.student_name
    FROM case_notes n
    LEFT JOIN users u ON n.author_id = u.id
    LEFT JOIN case_profiles p ON n.profile_id = p.id
    WHERE n.tenant_id = ?
  `;
  const params: unknown[] = [user.tenantId];

  if (profileId) { query += ' AND n.profile_id = ?'; params.push(profileId); }
  query += ' ORDER BY n.created_at DESC';

  const rows = db.prepare(query).all(...params) as any[];
  res.json(rows.map(mapNote));
});

router.get('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const row = db.prepare(`
    SELECT n.*, u.full_name AS author_full_name, u.email AS author_email, p.student_name
    FROM case_notes n
    LEFT JOIN users u ON n.author_id = u.id
    LEFT JOIN case_profiles p ON n.profile_id = p.id
    WHERE n.id = ? AND n.tenant_id = ?
  `).get(req.params.id, user.tenantId) as any;

  if (!row) { res.status(404).json({ message: 'Not found' }); return; }
  res.json(mapNote(row));
});

router.post('/', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { profileId, appointmentId, content } = req.body;

  if (!profileId || !content) {
    res.status(400).json({ message: 'profileId and content are required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO case_notes (tenant_id, profile_id, appointment_id, author_id, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.tenantId, profileId, appointmentId || null, user.userId, content);

  const row = db.prepare(`
    SELECT n.*, u.full_name AS author_full_name, u.email AS author_email, p.student_name
    FROM case_notes n
    LEFT JOIN users u ON n.author_id = u.id
    LEFT JOIN case_profiles p ON n.profile_id = p.id
    WHERE n.id = ?
  `).get(result.lastInsertRowid) as any;

  res.status(201).json(mapNote(row));
});

router.patch('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  const { content } = req.body as { content?: string };
  if (!content) { res.status(400).json({ message: 'content is required' }); return; }

  db.prepare(`UPDATE case_notes SET content = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`)
    .run(content, req.params.id, user.tenantId);

  const row = db.prepare(`
    SELECT n.*, u.full_name AS author_full_name, u.email AS author_email, p.student_name
    FROM case_notes n
    LEFT JOIN users u ON n.author_id = u.id
    LEFT JOIN case_profiles p ON n.profile_id = p.id
    WHERE n.id = ?
  `).get(req.params.id) as any;

  res.json(mapNote(row));
});

router.delete('/:id', (req: Request, res) => {
  const user = (req as AuthRequest).user;
  db.prepare('DELETE FROM case_notes WHERE id = ? AND tenant_id = ?').run(req.params.id, user.tenantId);
  res.status(204).end();
});

export default router;
