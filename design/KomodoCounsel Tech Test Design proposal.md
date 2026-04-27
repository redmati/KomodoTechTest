# System Architecture Design
### School Counselling MVP — Komodo Tech Test

**Author:** Red Mati
**Date:** April 27, 2026  
**Scope:** Home work for Komodo (my Tech Test) Establish design and then build a multi-tenant, single-region web application for school counselling MVP. It should cover taking new referrals, managing case profiles, scheduling appointments and creating case notes after the counselling appointment.



## 1. System Architecture Diagram

```
ACTORS for the jtbds (type)
  Counsellor (Authenticated)
  Student / Parent / Teacher (Unauthenticated)
         |
         | HTTPS
EDGE hosting for the React SPA static resorces like html, css, iamges etc.. 
  Static Hosting + CDN  (e.g. AWS S3 - this is what we use here at Xero, or Azure Static Web Apps - i haven't done this one myself, no previous opportunity)
  • Counsellor Portal SPA (protected routes only)
  • Public Referral Form 
         | Counsellor Portal >  interact with RESTful API,  let's use Bearer JWT for connecting securely
         | Public referral form > send a POST to non-secured /public/referrals/:<tenant id> or <schoold id> (no auth needed here)
APPLICATION LAYER
  Load Balancer or similar to be controlled by Cloud provider
         |
  Express REST API — Node.js + TypeScript
  Middleware stack:
    • Tenant Resolver
    • JWT Auth Guard
    • Rate Limiter
    • Audit Logger
    • Backend services (Note: I prfer to use SQL server, enforce with Transparent data encryption SQL server feature to keep data encrypted due to sensitivity of counselling notes)
        • SQL Server Primary DB (for main Reads/Writes)
          Automated backups (DRE responsibility)
        • SQL server read-only replaica DB for Reporting or insights
          async replication from Primary (DRE responsibility)
        • Store/retrive File Storage for Case profile attachments "the other related objects" mentioned in the requirement which i assume can be blob/file objects
    • Other considerations for PRODUCTION-readiness
         Send email or similar notification mechanism after a referral has been submitted (to notify the counsellors)
         Store and fetch secrets, sensitie config keys from a Secret Manager (e.g. AWS secrets manager, Azure key vault)
         Emit telemetry Monitoring + alerting  (e.g. New Relic, Azure App Insights)
         
```

---

## 2. Multi-Tenancy approach

Each school is basically a **tenant**, using **row-level multi-tenancy** for MVP simplicity.

Notes:
• Tenant identification include tenant_id column on every sensitive table; resolved from JWT claim or subdomain on every request
• use a short code like a slug to uniquely identify tenant to be browser/URL friendly and human readable e.g. "saint-peter-beckenham"
---

## 3. Entity Relationship Diagram

```
TENANTS
  tenant_id            (PK)
  name
  tenant_code use this in public referral URL to identify the intended school using human readable code/alias
  is_active
  created_at

USERS
  id            (PK)
  tenant_id     (FK → TENANTS)
  email
  password_hash
  full_name
  role          counsellor | admin
  is_active
  created_at

REFERRALS
  id            (PK)
  tenant_id     (FK → TENANTS)
  student_name
  school_year
  referrer_name
  referrer_role "student, parent, teacher"
  reason        [encrypted]
  student_consent
  status        PENDING, ASSIGNED,CLOSED,DELETED
  assigned_to   (FK → USERS, nullable) "the counsellor"
  deleted_by    (FK → USERS, nullable)
  deleted_reason  required when status = DELETED
  created_at
  updated_at

CASE_PROFILES
  id                  (PK)
  tenant_id           (FK → TENANTS)
  student_name
  school_year
  source_type         MANUAL | REFERRAL
  source_referral_id  (FK → REFERRALS, nullable)
  owner_id            (FK → USERS)
  status              ACTIVE,CLOSED
  created_at
  updated_at

CASE_PROFILE_ACCESS
  id            (PK)
  profile_id    (FK → CASE_PROFILES)
  user_id       (FK → USERS)
  access_level  VIEW_ONLY, OWNER "this can be expanded later as required by the process"
  granted_by    (FK → USERS)
  created_at

APPOINTMENTS
  id               (PK)
  tenant_id        (FK → TENANTS)
  profile_id       (FK → CASE_PROFILES)
  counsellor_id    (FK → USERS)
  scheduled_at
  duration_minutes
  status           SCHEDULED, COMPLETED, CANCELLED, NO_SHOW   "anticipated statuses, can be expanded as required"
  created_at
  updated_at

CASE_NOTES
  id              (PK)
  tenant_id       (FK → TENANTS)
  profile_id      (FK → CASE_PROFILES)
  appointment_id  (FK → APPOINTMENTS, nullable)
  author_id       (FK → USERS)
  content         [encrypted at application layer]
  created_at
  updated_at

AUDIT_LOGS
  id           (PK)
  tenant_id    (FK → TENANTS)
  user_id      (FK → USERS, nullable — null for public actions)
  action       CREATE,READ,UPDATE, DELETE
  entity_type
  entity_id
  old_values   JSON snapshot
  new_values   JSON snapshot
  ip_address
  created_at

Relationships
  TENANTS           1 - M USERS
  TENANTS           1 - M REFERRALS
  TENANTS           1 - M CASE_PROFILES
  TENANTS           1 - M APPOINTMENTS
  TENANTS           1 - M CASE_NOTES
  TENANTS           1 - M AUDIT_LOGS
  USERS             1 - M REFERRALS          (assigned_to)
  USERS             1 - M CASE_PROFILES      (owner)
  USERS             1 - M CASE_PROFILE_ACCESS
  USERS             1 - M APPOINTMENTS       (counsellor)
  USERS             1 - M CASE_NOTES         (author)
  REFERRALS         1 - 0..1 CASE_PROFILES   (source referral is optional, case profile can be created in the Case Profiles page withour referral)
  CASE_PROFILES     1 - M CASE_PROFILE_ACCESS
  CASE_PROFILES     1 - M APPOINTMENTS
  CASE_PROFILES     1 - M CASE_NOTES
  APPOINTMENTS      1 - 1 CASE_NOTES (assuming 1 case note only per appointment)
```

---

## 4. API Surface

### Public (no authentication)

| Method | Path | Description |
|---|---|---|
| `GET`  | `/api/v1/public/tenants/:tenant_code` | Verify tenant exists before rendering form |
| `POST` | `/api/v1/public/referrals/:tenant_code` | Submit referral form |

The tenant code is embedded in the shareable link, e.g. `https://app.example.com/referral/saint-peter-beckenham`. This avoids exposing internal IDs and is human-readable.

### Authenticated (Bearer JWT required)

Resource Endpoints

| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Referrals | `GET /referrals?status=PENDING\|ASSIGNED\|CLOSED\|DELETED`, `GET /referrals/:id`, `PATCH /referrals/:id/assign`, `DELETE /referrals/:id` (soft, with reason) |
| Case Profiles | `GET /case-profiles`, `POST /case-profiles`, `GET /case-profiles/:id`, `PATCH /case-profiles/:id`, `DELETE /case-profiles/:id` |
| Profile Access | `POST /case-profiles/:id/access` (grant view/transfer ownership), `DELETE /case-profiles/:id/access/:userId` |
| Appointments | `GET /appointments?counsellorId=&from=&to=`, `POST /appointments`, `PATCH /appointments/:id`, `DELETE /appointments/:id` |
| Case Notes | `GET /case-notes?profileId=`, `POST /case-notes`, `GET /case-notes/:id`, `PATCH /case-notes/:id`, `DELETE /case-notes/:id` |

---

## 5. Frontend Route Map

```
/referral/:tenantCode          Public referral form (no auth)
/login                         Authentication page

/ (redirect → /referrals)
/referrals                     Referral list (tabs: Unassigned / Assigned / Past / Deleted)
/referrals/:id                 Referral detail + assign / delete actions

/case-profiles                 Case profile list
/case-profiles/new             Create new profile
/case-profiles/:id             Profile detail (history, appointments, notes, permissions)

/calendar                      Counsellor's own calendar; schedule appointments
/calendar/:counsellorId        View another counsellor's calendar (if permitted)

/case-notes/:id                Individual case note view / edit
```

---

## 6. Permission Model

```
Counsellor A (Owner)
│
├── Full CRUD on Case Profile
├── Full CRUD on associated Appointments & Case Notes
├── Can grant VIEW_ONLY access → Counsellor B
│       Counsellor B: read-only on profile + related objects
└── Can transfer OWNER → Counsellor C  (atomic: old owner loses ownership)

Any Counsellor (in the same tenant/school):
├── Can view PENDING referrals
├── Can assign PENDING referral to self or any other counsellor
└── Can soft-delete PENDING referral (must supply plain text reason)
```

Access is enforced at the **service layer** in the API.

---

## 7. Referral Lifecycle

```
[new submission]
       |
       v
    PENDING  ──── counsellor assigns ────────────> ASSIGNED
       |                                               |
       |                                   counsellor unassigns
       |                                               |
       |                                               v
       |                                           PENDING
       |                                               |
       |                              case profile created / resolved
       |                                               |
       |                                               v
       |                                            CLOSED ──> [end]
       |
       └── counsellor deletes (reason required) ──> DELETED ──> [end]
```

---

## 8. Health Data Considerations

Handling student mental-health records requires careful attention to UK data protection law (UK GDPR / Data Protection Act 2018) and general information security good practice.

| Control | Implementation |
|---|---|
| **Encryption at rest** | SQL Server Transparent Data Encryption (TDE) enabled; Blob Storage encrypted with platform-managed keys (upgrade to customer-managed keys for higher sensitivity) |
| **Encryption in transit** | TLS 1.2+ enforced end-to-end; HSTS headers on API and CDN |
| **Application-layer encryption** | `case_notes.content` and `referrals.reason` additionally encrypted at the API layer (AES-256) before writing, using a key from Key Vault — prevents DBAs from reading clinical content in plaintext |
| **Audit logging** | All `CREATE`, `READ`, `UPDATE`, `DELETE` operations on sensitive entities are written to `audit_logs` with user, timestamp, IP, and before/after snapshots |
| **Data minimisation** | Referral form captures only what is needed; no NHS/student ID numbers stored in MVP |
| **Access control** | JWT expiry: 15-minute access token + 7-day refresh token; refresh token rotation on use |
| **Soft deletes** | Referrals are soft-deleted (status = `DELETED`) to preserve audit trail; hard deletes require a scheduled data-retention job with appropriate policy |
| **Backup & recovery** | Automated daily full backups + transaction log backups; geo-redundant backup storage even within a single region |
| **No PII in logs** | Application telemetry/error logs must not contain student names, reasons, or note content — structured logging with explicit allow-list fields |
| **Right to erasure** | A data erasure workflow should anonymise PII fields when a student requests deletion (names → `[REDACTED]`), preserving structural audit data without identifying individuals |

---

## 9. Key Architectural Decisions & Tradeoffs

| Decision | Chosen | Rationale | Alternative |
|---|---|---|---|
| Multi-tenancy model | Row-level (`tenant_id`), enforced in API service layer | Simplest to operate for MVP; single schema to migrate | Schema-per-tenant for stronger isolation at scale |
| Auth | JWT (stateless) | Scales horizontally with no shared session store | Session cookies + Redis if stricter revocation is needed |
| API style | REST | Simpler to build and test for this CRUD-heavy domain | GraphQL would add flexibility for the profile detail view but adds complexity |
| Case note encryption | Application-layer AES + TDE | Protects against storage-layer breaches | If adaopting SQL server for BE, use Field-level Always Encrypted — more performant but less portable |
| Referral public URL | Tenant code in URL | Human-readable, no auth required, no secret in URL | Signed/expiring JWT link — better for time-limited access but more complex |
| Read replica | Yes (from day 1) | Calendar queries + reporting can be read-heavy; isolates writes | Single instance fine for very low load but introduces operational debt later |

---

## 10. Project Folder Structure (proposed)

```
/
├── client/                  # React + TypeScript + Vite SPA
│   ├── src/
│   │   ├── api/             # Typed API client (fetch wrappers)
│   │   ├── components/      # Shared UI components
│   │   ├── pages/           # Route-level page components
│   │   │   ├── ReferralForm/
│   │   │   ├── Referrals/
│   │   │   ├── CaseProfiles/
│   │   │   ├── Calendar/
│   │   │   └── CaseNotes/
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # State management (e.g. Zustand / React Query)
│   │   └── types/           # Shared TypeScript types
│   └── vite.config.ts
│
├── server/                  # Express + TypeScript API
│   ├── src/
│   │   ├── config/          # Env, DB connection, Key Vault
│   │   ├── middleware/       # tenantResolver, authGuard, rateLimiter, auditLogger
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── referrals/
│   │   │   ├── caseProfiles/
│   │   │   ├── appointments/
│   │   │   └── caseNotes/
│   │   ├── db/              # SQL Server client, migrations, seed
│   │   └── app.ts
│   └── tsconfig.json
│
├── design/                  # This document + diagrams
└── docker-compose.yml       # Local dev: SQL Server + API + client
```



## Reasoning & Commentary
• I have spent a good amount of time analysing the applicable System architecture/design proposal to satisfy all the core requirements of the exercise. Apologies as I only used plain MD file to achieve this.

• I didn't managed to get to containerising the solution given the press for time but the app contains the requisite full stack using the tech stack specifications.

• The backend I used is in-memory only. To productionise, this should be converted to a permanent data store ideally SQL server or equivalent RDBMS.

• I haven't done BE implementation using Express so I use gen code to perform this task in the limited timeframe. I'm a fast learner and can easily adapt to Komodo's tech stack if selected for the role.

• When a Case profile is created in the page, current implementation lacks auto-refreshing it on the list

• Referral linking to Case Profile is manual input text - this needs to be converted to list lookup.

• Overall, the UI/UX flow requires fine-tuning to tighten and introduce validations


So in summary the following are next steps to further eveolve the app for production-readiness:

1. Real database + migrations (use SQL server or similar RDBMS)
2. Proper refresh token flow
3. Input validation + global error handlers
4. Audit logging
5. Encryption at rest (employ TDE to secure sensitive counselling & notes data)
6. Containerisation + CI/CD
7. Automation Tests and integrate into CI/CD
8. Monitoring and Operational excellence (establish observability alerts, SLOs and SLAs to monitor health)
9. Further stretch: add Canary to CD if moving solution to Scale (e.g. via GHA or similar)
