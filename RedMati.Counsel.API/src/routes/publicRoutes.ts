import { Router } from 'express';
import { db } from '../db';

const router = Router();

// Verify tenant exists — called by the public referral form before rendering
router.get('/tenants/:tenantCode', (req, res) => {
  const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_code = ? AND is_active = 1').get(req.params.tenantCode) as any;
  if (!tenant) {
    res.status(404).json({ message: 'Tenant not found' });
    return;
  }
  res.json({ id: tenant.id, name: tenant.name, tenantCode: tenant.tenant_code, isActive: Boolean(tenant.is_active), createdAt: tenant.created_at });
});

// Public referral submission — no auth required
router.post('/referrals/:tenantCode', (req, res) => {
  const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_code = ? AND is_active = 1').get(req.params.tenantCode) as any;
  if (!tenant) {
    res.status(404).json({ message: 'Tenant not found' });
    return;
  }

  const { studentName, schoolYear, referrerName, referrerRole, reason, studentConsent } = req.body;
  if (!studentName || !schoolYear || !reason) {
    res.status(400).json({ message: 'studentName, schoolYear and reason are required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO referrals (tenant_id, student_name, school_year, referrer_name, referrer_role, reason, student_consent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(tenant.id, studentName, schoolYear, referrerName || null, referrerRole || null, reason, studentConsent ? 1 : 0);

  res.status(201).json({ id: result.lastInsertRowid });
});

export default router;
