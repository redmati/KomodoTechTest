import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

export const db = new Database(':memory:');

db.exec(`
  CREATE TABLE tenants (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    tenant_code TEXT NOT NULL UNIQUE,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id     INTEGER NOT NULL REFERENCES tenants(id),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'counsellor',
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE referrals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id),
    student_name    TEXT NOT NULL,
    school_year     TEXT NOT NULL,
    referrer_name   TEXT,
    referrer_role   TEXT,
    reason          TEXT NOT NULL,
    student_consent INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    assigned_to     INTEGER REFERENCES users(id),
    deleted_by      INTEGER REFERENCES users(id),
    deleted_reason  TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE case_profiles (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id          INTEGER NOT NULL REFERENCES tenants(id),
    student_name       TEXT NOT NULL,
    school_year        TEXT NOT NULL,
    source_type        TEXT NOT NULL DEFAULT 'MANUAL',
    source_referral_id INTEGER REFERENCES referrals(id),
    owner_id           INTEGER NOT NULL REFERENCES users(id),
    status             TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE case_profile_access (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id   INTEGER NOT NULL REFERENCES case_profiles(id),
    user_id      INTEGER NOT NULL REFERENCES users(id),
    access_level TEXT NOT NULL DEFAULT 'VIEW_ONLY',
    granted_by   INTEGER NOT NULL REFERENCES users(id),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE appointments (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id        INTEGER NOT NULL REFERENCES tenants(id),
    profile_id       INTEGER NOT NULL REFERENCES case_profiles(id),
    counsellor_id    INTEGER NOT NULL REFERENCES users(id),
    scheduled_at     TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status           TEXT NOT NULL DEFAULT 'SCHEDULED',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE case_notes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id      INTEGER NOT NULL REFERENCES tenants(id),
    profile_id     INTEGER NOT NULL REFERENCES case_profiles(id),
    appointment_id INTEGER REFERENCES appointments(id),
    author_id      INTEGER NOT NULL REFERENCES users(id),
    content        TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── Seed ──────────────────────────────────────────────────────────────────

const hash = bcrypt.hashSync('Password1!', 10);

// Tenant
db.prepare(`INSERT INTO tenants (name, tenant_code) VALUES (?, ?)`).run('Komodo Saint Peter', 'komodo-saint-peter');

// Users
db.prepare(`INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`).run(1, 'counsellor@komodo.test', hash, 'Alex Counsellor', 'counsellor');
db.prepare(`INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`).run(1, 'jane@komodo.test', hash, 'Jane Smith', 'counsellor');

// Referrals
const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString();

db.prepare(`INSERT INTO referrals (tenant_id, student_name, school_year, referrer_name, referrer_role, reason, student_consent, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(1, 'Emma Johnson', 'Year 10', 'Mrs Davis', 'teacher', 'Showing signs of anxiety and withdrawal from class activities.', 1, 'PENDING');

db.prepare(`INSERT INTO referrals (tenant_id, student_name, school_year, referrer_name, referrer_role, reason, student_consent, status, assigned_to)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(1, 'Liam Thompson', 'Year 9', 'Parent', 'parent', 'Concerns about social isolation and difficulty making friends.', 1, 'ASSIGNED', 1);

db.prepare(`INSERT INTO referrals (tenant_id, student_name, school_year, referrer_name, referrer_role, reason, student_consent, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(1, 'Sofia Martinez', 'Year 11', null, null, 'Self-referred — seeking support with exam stress.', 1, 'CLOSED');

// Case Profile (linked to Liam's referral)
db.prepare(`INSERT INTO case_profiles (tenant_id, student_name, school_year, source_type, source_referral_id, owner_id)
  VALUES (?, ?, ?, ?, ?, ?)`).run(1, 'Liam Thompson', 'Year 9', 'REFERRAL', 2, 1);

// Appointment
db.prepare(`INSERT INTO appointments (tenant_id, profile_id, counsellor_id, scheduled_at, duration_minutes, status)
  VALUES (?, ?, ?, ?, ?, ?)`).run(1, 1, 1, tomorrow, 60, 'SCHEDULED');

// Case Note
db.prepare(`INSERT INTO case_notes (tenant_id, profile_id, author_id, content)
  VALUES (?, ?, ?, ?)`).run(1, 1, 1, 'Initial assessment session. Student appears anxious but engaged. Agreed to meet weekly for the next four weeks.');

console.log('✅ SQLite in-memory DB initialised and seeded');
