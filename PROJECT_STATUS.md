# Project Status Report — Walasmulla Alumni Association Management System

_Last updated: 2026-07-14 (accounts ledger + recording-permission change)_

This document is a reference for future updates/handoff. It captures what exists, where it's deployed, and what's left to do.

## 1. Project Overview

A bilingual (Sinhala/English) web application for managing members of the
**වලස්මුල්ල ආදර්ශ ප්‍රාථමික විද්‍යාලීය ආදි ශිෂ්‍ය සංගමය** (Walasmulla Model Primary
School Alumni Association). It supports two kinds of users:

- **Members** — manage their own profile, children, fee/donation/labour records,
  view their meeting attendance history, show a personal QR code, and read messages.
- **Executives** (chairman, vice chairman, secretary, vice secretary, treasurer) —
  everything a member can do, plus: browse/edit any member's record, scan QR codes
  to record meeting attendance, send messages (individual/group/broadcast), view a
  reports dashboard, and appoint/remove executive committee members with a full
  audit trail.

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript, Tailwind CSS v4, react-router-dom, react-i18next, recharts, html5-qrcode |
| Backend | Node.js + Express + TypeScript, Prisma ORM, JWT auth (access + refresh), bcryptjs, Zod validation, express-rate-limit, helmet |
| Database | PostgreSQL |
| Frontend hosting | Vercel (free tier) |
| Backend hosting | Render (free tier, web service) |
| Database hosting | Supabase (free tier) |
| Source control | GitHub |

## 3. Live URLs

| What | URL |
|---|---|
| Frontend (production) | https://walasmulla-alumni.vercel.app |
| Backend API | https://walasmulla-alumni-backend.onrender.com |
| Backend health check | https://walasmulla-alumni-backend.onrender.com/api/health |
| GitHub repo | https://github.com/malawigea-gif/WalasmullaAlumni |
| Vercel project dashboard | https://vercel.com/liyana-it-solutions/walasmulla-alumni |
| Render service dashboard | https://dashboard.render.com (service: `walasmulla-alumni-backend`) |
| Supabase project dashboard | https://supabase.com/dashboard (project ref: `jmnilmziawafibjtmvqb`) |

No custom domain is configured — the app runs on the free platform subdomains above.

## 4. Implemented Features

**Auth & accounts**
- Register / login / logout, JWT access + refresh token flow
- Forgot-password endpoint (logs a reset request; no email delivery wired up yet)
- Role-based access control: `member` vs `executive` vs `admin`, enforced on
  both API routes (middleware) and frontend routes (protected routes). The
  `authenticate` middleware re-fetches role/status from the DB on every
  request (not just from the JWT claim), so blocking/deleting an account or
  revoking a delegation takes effect immediately, without waiting for the
  access token to expire.
- Account status: `active` / `blocked` (`Member.status`) and soft-delete
  (`Member.deletedAt`) — blocked or deleted accounts cannot log in or use an
  existing token

**Member self-service**
- Profile view/edit: personal info, address, GN division/DS division/district,
  school period, academic/co-curricular achievements, scholarship exam result,
  leadership roles, extracurricular groups, higher education, profile photo upload
- Dynamic add/remove of children under a member's profile
- Fee payment / donation / labour contribution: view own history (read-only —
  as of 2026-07-14, only executives/admin can record these; see below)
- Attendance history (list of meetings attended)
- Personal QR code (view + download as image)
- Inbox (view received messages, mark as read)
- Association Accounts (`/accounts`, read-only): approved income/expense
  ledger entries, but only through the end of last calendar month — the
  current month's entries stay hidden from members even if already approved

**Executive-only**
- Member directory: search, filter, pagination; view/edit any member's profile.
  Includes a "Scan QR" option (camera-based, via html5-qrcode) as an
  alternative to typing a name/email — scanning a member's personal QR code
  resolves it (`GET /members/by-qr/:qrToken`, `requireElevatedAccess`) and
  jumps straight to that member's profile page.
- Record a fee payment / donation / labour contribution on behalf of any
  member — as of 2026-07-14 this is executive/admin/delegated-member only
  (`requireElevatedAccess` on the `POST` routes); plain members can no longer
  self-record these, only view their own history. All data entry happens from
  a member's own profile page (`/members/:id`), not the self-service pages.
- QR Scanner page (camera-based, via html5-qrcode): select a meeting, scan a
  member's QR code, record attendance (duplicate-scan protected)
- Confirmation workflow: executives, admins, and delegated members can confirm
  a member's fee payment, donation, labour contribution, or meeting attendance
  from that member's profile page. Each of the four records carries
  `confirmedBy` (FK to the confirming Member) and `confirmedAt` (timestamp) —
  a record is "confirmed" only once both are set. `PATCH
  /members/:id/{fee-payments,donations,labour-contributions,attendance}/:recordId/confirm`
  (`requireElevatedAccess`; 409 if already confirmed). Plain members see a
  read-only Confirmed/Pending badge on their own records but cannot confirm
  anything, including their own.
- Send Message: individual (search + pick a member), group (filter by district /
  grama niladhari division), or broadcast (all members)
- Reports dashboard: total members, fee collection by year (chart), total
  donations, total labour hours, per-meeting attendance % (chart), with a table
  view fallback for accessibility
- Executive Management: view current holders of all 5 positions, appoint/remove
  (only a current executive can do this; appointing to an occupied position
  auto-removes the previous holder), full audit history (actor, target, action,
  reason, timestamp)
- Accounts Management (`/accounts/manage`, executive/admin only — deliberately
  excludes delegated members): full income/expense ledger with a dual-approval
  workflow. Only the member currently holding the **treasurer** position can
  record a new entry (`POST /accounts/entries`, `requireTreasurer`). Any other
  executive or admin can approve it (`POST /accounts/entries/:id/approve`,
  `requireExecutiveOrAdmin`) — an entry needs exactly 2 distinct approvers,
  the treasurer who recorded it cannot approve their own entry
  (maker-checker), and the same person cannot approve twice. An entry is
  "fully approved" once it has 2 `AccountEntryApproval` rows.

**Admin-only**
- Admin Dashboard (`/admin`, `frontend/src/pages/admin/AdminDashboardPage.tsx`):
  member list with block/unblock, soft-delete/restore, and privilege-delegation
  actions, plus an audit log view
- Block/unblock any member (`Member.status`); blocked members are rejected at
  login and their existing access token stops working on the next request
- Soft-delete/restore any member (`Member.deletedAt`) — related records
  (payments, donations, attendance, etc.) are never orphaned since the row
  itself is kept; deleted members are excluded from the normal member
  directory and messaging recipient lists
- View/create/edit any member's fee payments, donations, labour contributions,
  and attendance, and send messages (individual/group/broadcast) — same
  permission surface as executives, via a shared `requireElevatedAccess` /
  `requireSelfOrElevated` middleware (`backend/src/middleware/auth.ts`)
- Temporary Privilege Delegation: grant a plain member temporary
  executive-level access (`PrivilegeDelegation` table), revoke it at any time
  (takes effect immediately — no re-login needed). A member with an active
  delegation sees a banner in the app layout and gains the same elevated
  permissions as an executive for payments/donations/labour/attendance/
  messaging, but not admin-only actions (block/delete/delegate)
- Every block/unblock/delete/restore/delegate/revoke action is written to a
  generic `AuditLog` table (actor, target, action, reason, timestamp)

## 5. Architecture Summary

Simple 3-tier architecture:

```
React SPA (Vercel)  →  Express API (Render)  →  PostgreSQL (Supabase)
```

- Frontend talks to the backend only via `VITE_API_BASE_URL` (absolute URL in
  production, dev-server proxy locally) — no direct DB access from the browser.
- Backend is stateless (JWT-based auth), so it can be scaled horizontally if needed.
- Prisma is the only thing that talks to Postgres.

**Database entities** (see `backend/prisma/schema.prisma` for full field lists):

- `Member` — account/auth record (email, password hash, role, executive position)
- `MemberProfile` — one-to-one extended profile fields
- `Child` — one-to-many, a member's children
- `ExecutivePosition` — the 5 fixed positions and their current holder
- `ExecutiveHistory` — append-only audit log of appoint/remove actions
- `FeePayment`, `Donation`, `LabourContribution` — per-member financial/contribution
  records; each has `recordedBy` (who logged it) plus `confirmedBy`/`confirmedAt`
  (who verified it, and when — null until an executive/admin/delegated member confirms)
- `Meeting`, `MeetingAttendance` — meetings and who attended (via QR scan);
  `MeetingAttendance` also carries `confirmedBy`/`confirmedAt` for the same
  confirmation workflow
- `Message`, `MessageRecipient` — messages and per-recipient read status
- `QRCode` — one unique QR token per member
- `AccountEntry` — association ledger entry (type income/expense, description,
  amount, entryDate, recordedBy — treasurer only); `AccountEntryApproval` —
  one row per distinct approver (unique on entry+approver), 2 rows = fully
  approved
- `PrivilegeDelegation` — temporary executive-level access grants (member,
  granted-by admin, granted-at, revoked-at, is-active)
- `AuditLog` — generic actor/target/action/reason/timestamp log for admin
  actions (block, unblock, delete, restore, delegation grant/revoke)

## 6. Deployment Notes

**How the three services connect:**

```
GitHub repo (master branch)
    ├── Vercel watches this repo (root dir: frontend/) → builds + deploys on push
    └── Render watches this repo (render.yaml blueprint, rootDir: backend/) → builds + deploys on push
                     ↓
Render's backend connects to Supabase Postgres via DATABASE_URL (pooled, 6543) / DIRECT_URL (session pooler, 5432, used for migrations)
```

**Config files in the repo:**
- `render.yaml` — Render Blueprint: build command (`npm install && npx prisma generate && npx prisma migrate deploy && npm run build`), start command, health check path, env var declarations (no secret values — those live only in each platform's dashboard)
- `frontend/vercel.json` — SPA rewrite rule so client-side routing (react-router) works on Vercel's static hosting

**Environment variables (keys only — actual values live in Render/Vercel dashboards and local `.env` files, never in git):**

Backend (Render):
- `DATABASE_URL` — pooled Postgres connection string (Supabase, port 6543, `?pgbouncer=true`)
- `DIRECT_URL` — session-pooler Postgres connection string (Supabase, port 5432; used only for `prisma migrate deploy`)
- `CORS_ORIGIN` — the frontend's production URL
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — signing secrets
- `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` — token lifetimes
- `UPLOAD_DIR` — local folder name for profile photo uploads
- `PORT` — auto-injected by Render, not manually set

Frontend (Vercel):
- `VITE_API_BASE_URL` — absolute URL of the backend API (`https://walasmulla-alumni-backend.onrender.com/api`)

Important gotcha found during setup: Supabase's **direct connection host** (`db.<ref>.supabase.co:5432`) is IPv6-only and wasn't reachable from this environment or reliably from Render — use the **session pooler** (`aws-<region>.pooler.supabase.com:5432`, same username format `postgres.<project-ref>`) as `DIRECT_URL` instead.

## 6a. Access-Control Verification (2026-07-14)

Verified end-to-end (live requests against a running dev server) that plain
members without an active delegation are rejected (403) from: viewing another
member's profile/history, recording or confirming another member's
fee/donation/labour/attendance record, browsing the member directory, and
sending any message (individual or broadcast) — all enforced by
`requireElevatedAccess` / `requireSelfOrElevated` in
`backend/src/middleware/auth.ts`, not just hidden in the UI. Also confirmed
delegation grant/revoke takes effect immediately (no re-login needed).

While verifying this, found and fixed a bug: `POST /meetings/:id/attendance/scan`
was gated with `requireExecutive` (executive role only), which silently
excluded admins and delegated members even though this doc already documented
delegation as granting "the same elevated permissions as an executive for
payments/donations/labour/attendance/messaging." Changed to
`requireElevatedAccess` in `backend/src/routes/meetings.routes.ts` to match.

## 7. Known Limitations

- **Render free tier spins down after ~15 minutes of inactivity.** The first
  request after idling takes 30-50 seconds to wake the service back up. This is
  a platform limitation, not an app bug — upgrading to a paid Render plan removes it.
- **Profile photo uploads don't persist.** Render's free tier has an ephemeral
  filesystem — uploaded files are lost on every redeploy or restart. Fine for
  demoing, not fine for real usage.
- **No custom domain** — running on `*.vercel.app` / `*.onrender.com` subdomains.
- **No outbound email/SMS.** Forgot-password just logs the request server-side;
  there's no actual email delivery.
- **No online payment gateway** — fee payments/donations are recorded manually
  by a member or executive, not collected through a payment processor.
- Large frontend JS bundle (~1.1 MB) — a Vite build warning, not a functional
  issue, but worth code-splitting eventually.

## 8. Pending / Future Work

- Migrate profile photo storage to an S3-compatible bucket (or Supabase Storage)
  so uploads survive redeploys
- Register and wire up a custom domain (Vercel domain settings + DNS + update
  `CORS_ORIGIN` on Render)
- Email and/or SMS notifications (e.g. real forgot-password emails, message
  notifications, fee reminders)
- Online payment gateway integration for fee payments/donations
- Code-split the frontend bundle
- Consider a paid Render plan (or an alternative always-on host) to remove the
  cold-start delay if this becomes a real member-facing production system

## 9. Credential Management Notes

- All secrets (DB connection strings, JWT signing secrets, API keys) live only
  in: (a) each developer's local `backend/.env` / `frontend/.env` files, and
  (b) the Render and Vercel dashboards' environment variable settings.
- `.env` files are gitignored in both `backend/` and `frontend/`; only
  `.env.example` (no real values) is committed.
- No production secret has ever been committed to git — confirmed by review of
  every commit's staged files during setup.
- Third-party tokens used temporarily during setup (a GitHub PAT, a Render API
  key, a Vercel API token) were each used once for a specific one-off task and
  then revoked immediately afterward — none are active or reusable.
- If you need to rotate a secret (e.g. JWT secrets, DB password): update it in
  Supabase/Render/Vercel dashboards directly, there's no other copy to update.

## 10. Local Development Setup

```bash
git clone https://github.com/malawigea-gif/WalasmullaAlumni.git
cd WalasmullaAlumni

# Backend
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL / DIRECT_URL (a local Postgres works fine) + generate your own JWT secrets
npm run prisma:migrate
npm run seed            # optional: creates 1 admin + sample executives + members, password "Password@123"
npm run dev              # http://localhost:4000

# Frontend (separate terminal)
cd ../frontend
npm install
cp .env.example .env    # VITE_API_BASE_URL=/api is fine for local dev (Vite proxies to the backend)
npm run dev              # http://localhost:5173
```

Full details (env var meanings, seeded accounts) are in the root `README.md`.

## 11. How to Redeploy

**Normal case — just push:**
- Push to `master` on GitHub → Vercel and Render both auto-deploy from that
  branch. Render additionally re-runs `prisma migrate deploy` as part of its
  build command, so schema changes go out automatically too.

**Manual redeploy (no code change, e.g. after changing an env var):**
- *Render:* Dashboard → service → **Manual Deploy** → "Deploy latest commit"
  (or via API: `POST /v1/services/{serviceId}/deploys` with a Render API key).
  Changing an env var in the dashboard normally triggers this automatically,
  but if a build seems to be using stale values, trigger a manual redeploy to
  be sure it picks up the current ones.
- *Vercel:* Dashboard → project → **Deployments** → "..." on the latest one →
  **Redeploy** (or via CLI: `vercel --prod` from the `frontend/` directory with
  a Vercel token).

**After changing the frontend's URL or the backend's URL:**
- If the frontend URL changes, update `CORS_ORIGIN` on Render to match.
- If the backend URL changes, update `VITE_API_BASE_URL` on Vercel to match,
  then redeploy the frontend (env var changes require a rebuild for Vite apps).
