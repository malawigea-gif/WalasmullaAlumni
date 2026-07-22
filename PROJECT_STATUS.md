# Project Status Report — Walasmulla Alumni Association Management System

_Last updated: 2026-07-19 (membership numbers, admin notes history, PDF member reports, association accounts removed from plain members, treasurer account reset with admin approval, POS member-linked fee/aid/fine)_

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
- Fines (`/fines`, read-only): as of 2026-07-19, a new per-member `Fine`
  record type (mirrors `FeePayment`/`Donation`) with its own confirmation
  workflow; members can view but not create their own fines.
- Change own password (`/profile`, `POST /profile/me/password`): requires the
  current password (bcrypt-verified) before hashing and storing the new one.
  Available to every member, executive, and admin — not just admin-initiated
  resets.

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
  (executives and admins can do this; appointing to an occupied position
  auto-removes the previous holder), full audit history (actor, target, action,
  reason, timestamp). Admins additionally see an "Active Delegations" section
  here (reuses the existing admin-only delegation endpoints) to revoke a
  member's temporary executive access without leaving this page.
- Meetings (`/meetings`, executive/admin only): create, edit, and delete
  meetings, each tagged as a monthly meeting or an executive committee
  (කාරක සභා) meeting (`Meeting.type`). The same list feeds the QR Scanner
  page's meeting selector, which also gained inline Edit/Delete controls
  (executive/admin only) next to the dropdown — deleting a meeting is blocked
  with a 409 if it already has recorded attendance, to avoid silently wiping
  the attendance audit trail.
- Meetings can optionally include a labour-contribution session
  (`Meeting.hasLabourSession` + `Meeting.labourHours`, set from the create/edit
  form). When set, scanning a member's QR code for that meeting
  (`POST /meetings/:id/attendance/scan`) creates both the `MeetingAttendance`
  row and a matching `LabourContribution` row (description
  `"Meeting attendance: <title>"`, hours = `Meeting.labourHours`) in a single
  transaction — one scan records both. Creating a meeting also fires an
  automatic broadcast message (`backend/src/services/message.service.ts`,
  `sendBroadcastMessage`) to every member's inbox announcing the date/location
  and, if applicable, the labour-session hours; failures to send are logged
  but don't block meeting creation.
- Reports tab: alongside the existing computed summary dashboard, executives
  and admins can upload dated PDF report documents (title + date + file) and
  download or delete them later — backed by a new `ReportDocument` table and
  the same `StorageProvider` used for profile photos.
- Accounts Management (`/accounts/manage`, executive/admin only — deliberately
  excludes delegated members): full income/expense ledger with a dual-approval
  workflow. Only the member currently holding the **treasurer** position can
  record a new entry (`POST /accounts/entries`, `requireTreasurer`). Any other
  executive or admin can approve it (`POST /accounts/entries/:id/approve`,
  `requireExecutiveOrAdmin`) — an entry needs exactly 2 distinct approvers,
  the treasurer who recorded it cannot approve their own entry
  (maker-checker), and the same person cannot approve twice. An entry is
  "fully approved" once it has 2 `AccountEntryApproval` rows.
- Every `AccountEntry` carries a `category` (required for both income and
  expense, independent of the member-level `FeePayment`/`Donation` tables) and
  a `paymentMethod` (`cash` / `bank`). Income categories: `membership_fee`,
  `aid`, `fine`. Expense categories: `petty_cash`, `project`, `bank_payment`
  (`backend/src/schemas/account.schema.ts` validates category against type;
  `frontend/src/lib/accountCategories.ts` is the shared category/payment-method
  list). The page shows a current-balance stat tile (sum of fully-approved
  income minus fully-approved expenses) and a per-category income total,
  computed client-side from the entries already fetched. A "Release Funds"
  quick-action button pre-fills the entry form's type/category (no new
  endpoints).
- The flat entries table was replaced with a cashbook layout: a **Receipts**
  table (one row per date with fully-approved income that day: Membership
  Fees / Aid / Fines / Total / Bank Deposits / running Cash Balance / running
  Bank Balance, the latter two computed cumulatively over every approved
  entry in ascending date order) and a **Payments** table (one row per
  fully-approved expense: Date / Description / Petty Cash / Project / Bank
  Payment / Paid From Bank, computed by putting the entry's amount in the
  column matching its category and payment method). A separate **Pending
  Approval** table below keeps the old flat list (with the Approve action)
  for entries not yet fully approved. An **Issued Receipts** list surfaces
  income entries recorded with `receiptIssued` set.
- Budget (same page): the treasurer defines item-wise budget lines
  (`BudgetLine` — category, planned amount, year; `POST/GET
  /accounts/budget-lines`, treasurer creates / executive+admin view). An
  expense `AccountEntry` can optionally reference a `budgetLineId` — when it
  does, it's treasurer-authorized alone and **skips the dual-approval
  requirement entirely** (attempting to approve a budget-linked entry returns
  409); income entries cannot be linked to a budget line. The budget list
  shows planned/spent/remaining per line, computed live from linked entries.
- POS quick-entry window (`AccountsManagementPage` → "POS" button, opens
  `PosEntryModal`, treasurer-only): a focused entry screen with type tiles
  (membership fee / donation / other income / expense), description, amount,
  date, and an "Issue Receipt" checkbox. Posts to the same `POST
  /accounts/entries` endpoint. When the entry is **income** and the receipt
  checkbox is checked, `AccountEntry.receiptIssued` is set `true` and the
  entry needs no further approval (`computeIsFullyApproved` treats
  `budgetLineId` and income-with-`receiptIssued` the same way — both skip the
  2-approver workflow; attempting to approve either returns 409). Expense
  entries can also have a receipt printed at point of entry, but
  `receiptIssued` has no approval effect on expenses — only income. The modal
  also shows a running list of the current treasurer's entries recorded that
  day, and prints an 80mm thermal receipt immediately via `printReceipt()`
  after a successful save (when the checkbox is checked).
- As of 2026-07-19, when the POS tile is Membership Fee / Aid / Fine, a
  "Select Member" box (membership-number search or QR scan, reusing the same
  `Html5Qrcode` pattern as the Member Directory's scanner) is required before
  saving. Selecting a member causes `POST /accounts/entries` to create the
  ledger `AccountEntry` **and** the matching per-member record
  (`FeePayment`/`Donation`/`Fine`) in one transaction — the same
  dual-insert pattern already used for meeting labour-session QR scans. The
  manual (no-member) entry form is unaffected.
- Account Reset (2026-07-19, `AccountsManagementPage`, treasurer + admin):
  a maker-checker workflow for closing the books and starting a new
  accounting period. Treasurer requests a reset with a reason
  (`POST /accounts/reset-requests`); an admin must separately approve
  (`POST /accounts/reset-requests/:id/approve`) or reject it — only one
  reset request can be in flight at a time (409 otherwise). Once approved,
  the treasurer opens a dedicated "Enter Opening Balances" window
  (`AccountResetModal.tsx`) to set the new cash/bank starting balances
  (`POST /accounts/reset-requests/:id/apply`). All prior `AccountEntry` rows
  remain in the database (nothing is deleted), but the balance tiles and
  cashbook tables only sum entries dated on/after the latest applied reset's
  `appliedAt`, seeded from its opening balances — this filtering happens
  client-side (`GET /accounts/entries` still returns full history; a new
  `GET /accounts/reset-status` tells the frontend where the cutoff is).
- Thermal-printer receipts (`frontend/src/lib/receipt.ts`, `printReceipt()`):
  opens a browser print dialog styled for 80mm thermal paper
  (`@page { size: 80mm auto }`). Wired into `MemberDetailPage` (Print Receipt
  per fee-payment/donation row) and `AccountsManagementPage` (Print Voucher on
  budget-linked expense rows only, since only those are treasurer-issued
  "spending" the association needs a paper trail for at point of purchase).

**Admin-only**
- Admin Dashboard (`/admin`, `frontend/src/pages/admin/AdminDashboardPage.tsx`):
  member list with block/unblock, soft-delete/restore, and privilege-delegation
  actions, plus an audit log view
- Block/unblock any member (`Member.status`); blocked members are rejected at
  login and their existing access token stops working on the next request
- Reset a member's password (`POST /admin/members/:id/reset-password`):
  generates a random temporary password, hashes and stores it, and returns
  the plaintext once in the response for the admin to relay to the member
  directly (call/message) — there's still no outbound email/SMS, so this is
  the workaround for the "forgot password" flow (which only logs a request
  server-side; see Known Limitations). Logged to `AuditLog` as
  `password_reset`.
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
- Membership Type & Status: every member has a `membershipType`
  (`annual` / `honorary` / `exemplary` / `life`, admin-assignable from the
  Admin Dashboard's "Change Type" action). Only `annual` members have a
  meaningful `membershipStatus` (`active` / `inactive` / `resigned`) — every
  other type is always treated as active. Admin can mark an annual member
  "Resigned" or "Reactivate" them (`POST /admin/members/:id/{resign,reactivate}`);
  both are rejected with 400 for non-annual members. Switching a member's type
  away from `annual` always resets their status back to `active`. A member is
  auto-flagged `inactive` (`backend/src/services/inactivity.service.ts`,
  `recomputeInactivity`) after missing 4+ consecutive monthly meetings held
  since their last status change (run on Admin Dashboard load via
  `POST /admin/members/recompute-inactivity`, and available to call from a
  scheduler if one is added later).
- Admin Notes: as of 2026-07-19, a timestamped history rather than a single
  overwritable field — each save adds a new `AdminNote` row (member, author,
  note, createdAt) instead of replacing the old text. Visible only to admins,
  via a dedicated "Admin Notes" tab on that member's detail page
  (`/members/:id`, `GET`/`POST /admin/members/:id/notes`). The old single
  `Member.adminNotes` column was dropped; any existing free-text note was
  migrated forward as the first history entry.
- Membership Number: as of 2026-07-19, every member can be given a
  human-readable membership number (`Member.membershipNo`, free text,
  unique), assignable by an admin **or** the member currently holding the
  secretary position (`PUT /members/:id/membership-no`, new
  `requireAdminOrSecretary` middleware in `backend/src/middleware/auth.ts`).
  Shown on the member's own profile, the Member Directory table, and that
  member's detail page.
- Full Member Report PDF (2026-07-19, admin-only): a "Download Full Report
  (PDF)" button on a member's detail page generates and streams a single PDF
  (`GET /admin/members/:id/report.pdf`, `backend/src/lib/pdf/memberReport.ts`,
  using `pdfkit` — the app's first PDF-generation dependency) covering full
  profile details, fee payments, donations, labour contributions, and admin
  notes (if any) in one document.

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

- `Member` — account/auth record (email, password hash, role, executive
  position), plus `membershipType` (annual/honorary/exemplary/life,
  default annual), `membershipStatus` (active/inactive/resigned, default
  active, meaningful only for annual members) with
  `membershipStatusUpdatedAt`, and `membershipNo` (2026-07-19, optional
  unique free-text membership number, admin/secretary-assignable). The old
  `adminNotes` free-text column was dropped in favor of the `AdminNote`
  table below.
- `MemberProfile` — one-to-one extended profile fields
- `Child` — one-to-many, a member's children
- `ExecutivePosition` — the 5 fixed positions and their current holder
- `ExecutiveHistory` — append-only audit log of appoint/remove actions
- `FeePayment`, `Donation`, `LabourContribution`, `Fine` (2026-07-19) —
  per-member financial/contribution records; each has `recordedBy` (who
  logged it) plus `confirmedBy`/`confirmedAt` (who verified it, and when —
  null until an executive/admin/delegated member confirms).
  `LabourContribution` rows are also created automatically by a meeting's
  labour-session QR scan (see Meetings below); `FeePayment`/`Donation`/`Fine`
  rows can also be created automatically by a POS entry linked to a member
  (see Accounts below)
- `AdminNote` (2026-07-19) — timestamped admin-only note history per member
  (memberId, authorId, note, createdAt), replacing the old single
  `Member.adminNotes` field
- `AccountReset` (2026-07-19) — maker-checker record for a treasurer-initiated,
  admin-approved account reset (requestedBy/reason/status, approvedBy,
  openingCashBalance/openingBankBalance, appliedAt); status is one of
  pending/approved/rejected/applied
- `Meeting`, `MeetingAttendance` — meetings and who attended (via QR scan);
  `MeetingAttendance` also carries `confirmedBy`/`confirmedAt` for the same
  confirmation workflow. `Meeting` additionally carries `hasLabourSession`
  (bool) and `labourHours` (decimal) — when set, an attendance scan for that
  meeting also creates a matching `LabourContribution`, and creating the
  meeting fires an automatic broadcast `Message`
- `Message`, `MessageRecipient` — messages and per-recipient read status
- `QRCode` — one unique QR token per member
- `AccountEntry` — association ledger entry (type income/expense, description,
  amount, entryDate, recordedBy — treasurer only), `category` (required for
  both income and expense: `membership_fee`/`aid`/`fine` for income,
  `petty_cash`/`project`/`bank_payment` for expense) and `paymentMethod`
  (`cash`/`bank`, default cash), optional `budgetLineId`, `receiptIssued`
  (bool, only meaningful for income — set via the POS window), and (2026-07-19)
  optional `memberId` — set when a POS income entry was linked to a specific
  member, in which case a matching `FeePayment`/`Donation`/`Fine` row was
  also created in the same transaction;
  `AccountEntryApproval` — one row per distinct approver (unique on
  entry+approver), 2 rows = fully approved (skipped entirely when
  `budgetLineId` is set, or when the entry is income with `receiptIssued`)
- `BudgetLine` — treasurer-defined budget item (category, plannedAmount,
  year); linked `AccountEntry` expenses determine spent/remaining, computed
  on read, not stored
- `PrivilegeDelegation` — temporary executive-level access grants (member,
  granted-by admin, granted-at, revoked-at, is-active)
- `AuditLog` — generic actor/target/action/reason/timestamp log for admin
  actions (block, unblock, delete, restore, delegation grant/revoke,
  membership type changed, member resigned/reactivated)

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

## 6b. Second `requireExecutive`-excludes-admin Bug (2026-07-16)

Found and fixed the same bug class as 6a, in three more places:
`POST /meetings` (meeting create), `GET /reports/summary`, and all of
`executives.routes.ts` (`GET /history`, `POST /:position/appoint`,
`POST /:position/remove`) were gated with `requireExecutive` (role must be
exactly `"executive"`), which silently excluded the `admin` role. Since admin
is documented throughout this file as having full executive-level authority,
these were all switched to `requireExecutiveOrAdmin` (the middleware
`accounts.routes.ts` already used correctly). Delegated members were already
blocked by `requireExecutive` before and remain blocked after — no behavior
change for them. If a future `requireExecutive` usage is added, double-check
whether admin should be included — `requireExecutiveOrAdmin` is very likely
the correct choice for anything executive-committee-level.

## 6c. Six New Admin/Treasurer Features (2026-07-19)

Implemented and verified end-to-end (live API calls plus a Playwright
browser pass against the running dev servers, all seeded accounts):
membership numbers (admin/secretary-assignable), a timestamped Admin Notes
history (replacing the old single overwritable field), a one-click full
member PDF report, removal of the Association Accounts view from plain
members (both nav/route and the `GET /accounts/entries` API, which now
requires `requireExecutiveOrAdmin`), a treasurer-initiated /
admin-approved account reset with a dedicated opening-balance window, and
POS entries that can be linked to a specific member (creating a matching
`FeePayment`/`Donation`/`Fine` row alongside the ledger entry). See the
relevant bullets above (§4) and the new `AdminNote`/`AccountReset`/`Fine`
entities (§5) for details.

Two notable decisions made along the way:
- The account-reset balance cutoff is computed **client-side** — the
  `GET /accounts/entries` API still returns full history unfiltered, and
  `AccountsManagementPage` filters to entries on/after the latest applied
  reset's `appliedAt` before computing balances/cashbook tables. Nothing is
  ever deleted; a reset only changes what counts toward the *displayed*
  current-period balance.
- POS member-linking reuses the exact dual-insert transaction pattern
  already established for meeting labour-session QR scans
  (`backend/src/routes/meetings.routes.ts`) rather than introducing a new
  pattern — one `prisma.$transaction` creates both the ledger row and the
  per-member record.

## 6d. Account-Reset Backdated-Entry Verification (2026-07-22)

Verified (live API calls against the running dev server/DB) that a member-linked
`AccountEntry` recorded **after** an account reset but backdated to an `entryDate`
**before** the reset's `appliedAt` behaves correctly with no code changes needed:
it still appears in full in the paying member's own `FeePayment`/`Donation`/`Fine`
history (those routes in `members.routes.ts` query by `memberId` only, entirely
independent of `AccountReset`), but is correctly excluded from the current
cashbook/balance on `AccountsManagementPage` because the existing client-side
filter (`AccountsManagementPage.tsx`, `entryDate >= resetCutoff`) keys off
`entryDate`, not `createdAt`. The backend budget-report PDF route applies the
same `entryDate`-based cutoff. No bug found; no files changed. The test
`AccountEntry`/`FeePayment` rows created during this check were deleted from
the local dev DB afterward, and the local backend (`tsx watch`, ports 4000)
and frontend (`vite`) dev servers spun up for this verification were stopped
once it was done — no dev servers were left running.

## 6e. Trial Mode (2026-07-22)

The deployed backend enforces a time-limited trial: after `TRIAL_START_DATE` +
`TRIAL_LENGTH_DAYS`, every `/api/*` route except `/api/health` returns `403`
with `{ error: "Trial period has expired...", trialExpired: true }`. Before
expiry, there is zero behavior change — every existing feature works exactly
as documented above.

- **Implementation**: a single middleware, `backend/src/middleware/trial.ts`
  (`trialGuard`), registered in `backend/src/app.ts` right after the
  `/api/health` route and before every other route — so health checks always
  succeed but everything else is gated. If `TRIAL_START_DATE` is unset, the
  code falls back to a hardcoded default (`2026-07-22`, `90` days) rather than
  computing "now" dynamically, so the trial can't be bypassed by simply
  deleting the env var locally or in a stray deployment.
- **Frontend**: `frontend/src/lib/api.ts`'s axios response interceptor detects
  `403` + `trialExpired: true` on any API call (including login) and redirects
  to `/trial-expired`, which renders `frontend/src/pages/TrialExpiredPage.tsx`
  instead of the normal login page.
- **To extend the trial**: raise `TRIAL_LENGTH_DAYS` (or push out
  `TRIAL_START_DATE`) in the Render dashboard env vars and redeploy — no code
  change needed.
- **To remove trial mode entirely** (e.g. once the client pays): delete
  `backend/src/middleware/trial.ts`, remove the `app.use("/api", trialGuard)`
  line + its import in `backend/src/app.ts`, delete
  `frontend/src/pages/TrialExpiredPage.tsx`, remove the `/trial-expired` route
  in `frontend/src/App.tsx`, and remove the `403`/`trialExpired` check in
  `frontend/src/lib/api.ts`. Nothing else references trial logic.
- **Verified locally**: set `TRIAL_START_DATE=2026-01-01` (90 days later is
  well before today) in `backend/.env`, restarted the dev server, and
  confirmed `/api/health` still returned `200` while `/api/auth/login`
  returned `403` with the expired-trial body. Reverted the env var, restarted
  again, and confirmed login returned `200` normally (falls back to the
  code's built-in default, which is not yet expired).
- Env vars are documented in `backend/.env.example` and declared with explicit
  values in `render.yaml` (`TRIAL_START_DATE=2026-07-22`,
  `TRIAL_LENGTH_DAYS=90`); the live Render service's dashboard env vars were
  also set directly to the same values after this deploy.

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

- ~~Migrate profile photo storage to an S3-compatible bucket (or Supabase Storage)
  so uploads survive redeploys~~ — **partially done (2026-07-15, local dev):**
  uploads now go through a `StorageProvider` interface
  (`backend/src/lib/storage/`, driver selected via `STORAGE_DRIVER` env var)
  instead of a hardcoded disk path in the route. Only `LocalDiskProvider` is
  implemented so far — an S3/Supabase provider still needs to be written and
  wired in via `STORAGE_DRIVER` before this is deployed again. Also fixed:
  invalid/oversized uploads now return a proper `400` instead of falling
  through to a `500`.
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
