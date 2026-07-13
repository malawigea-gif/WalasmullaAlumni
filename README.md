# වලස්මුල්ල ආදර්ශ ප්‍රාථමික විද්‍යාලීය ආදි ශිෂ්‍ය සංගම් මෘදුකාංගය

Walasmulla Model Primary School Alumni Association — member management system.

Bilingual (Sinhala/English) full-stack app for managing alumni members, executive
committee roles, fee/donation/labour records, meeting attendance via QR codes, and
internal messaging.

## Tech stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT auth, bcrypt
- **Frontend:** React (Vite), TypeScript, Tailwind CSS v4, react-i18next, react-router,
  html5-qrcode, recharts

## Project structure

```
backend/    Express API, Prisma schema + migrations, seed script
frontend/   React SPA
```

## Prerequisites

- Node.js 20+
- A running PostgreSQL server (v13+)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://postgres:yourpassword@localhost:5432/walasmulla_alumni` |
| `PORT` | API port (default `4000`) |
| `CORS_ORIGIN` | Frontend origin allowed to call the API (default `http://localhost:5173`) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Random secrets used to sign JWTs — generate your own (e.g. `openssl rand -hex 32`) |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (default `15m` / `7d`) |
| `UPLOAD_DIR` | Local folder for profile photo uploads (default `uploads`) |

Create the database (if it doesn't exist yet):

```bash
createdb walasmulla_alumni
```

Run migrations and seed sample data:

```bash
npm run prisma:migrate
npm run seed
```

Start the API:

```bash
npm run dev
```

The API listens on `http://localhost:4000`.

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api` and `/uploads` requests to
the backend during development (see `vite.config.ts`).

## Seeded accounts

All seeded accounts use the password `Password@123`.

| Role | Email |
|---|---|
| Chairman (executive) | chairman@walasmulla-alumni.lk |
| Vice Chairman (executive) | vicechairman@walasmulla-alumni.lk |
| Secretary (executive) | secretary@walasmulla-alumni.lk |
| Vice Secretary (executive) | vicesecretary@walasmulla-alumni.lk |
| Treasurer (executive) | treasurer@walasmulla-alumni.lk |
| Member | member1@example.com / member2@example.com / member3@example.com |

## Key behaviors

- **Roles:** `member` (self-service only) and `executive` (one of chairman /
  vice_chairman / secretary / vice_secretary / treasurer). Executive-only pages and
  API routes are protected by role-based middleware.
- **Executive appointment/removal:** only a current executive can appoint or remove
  another executive. Appointing someone to an already-held position automatically
  removes the previous holder. Every change is recorded in the audit log
  (`ExecutiveHistory` — actor, target, action, reason, timestamp), visible on the
  Executive Management page.
- **QR attendance:** every member has a unique QR code (Profile → My QR Code).
  Executives scan it from the QR Scanner page (camera-based, via `html5-qrcode`)
  against a selected meeting to record attendance.
- **Messaging:** executives can message an individual member, a filtered group
  (by district / grama niladhari division), or broadcast to all members.
- **Reports:** fee collection by year, donation totals, labour hours, and
  per-meeting attendance percentage, with a chart + table view.
- **Security:** passwords hashed with bcrypt; JWT access + refresh tokens; login
  attempts rate-limited; all input validated with Zod on the backend.

## Useful commands

```bash
# Backend
cd backend
npm run prisma:studio   # browse the database
npm run build && npm start   # production build/run

# Frontend
cd frontend
npm run build   # production build (outputs to frontend/dist)
```
