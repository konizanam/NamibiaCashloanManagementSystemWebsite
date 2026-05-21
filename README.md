# NCLMS — Namibia Cash Loan Management System

End-to-end loan management platform for Namibian microlenders. NAMFISA-aligned reporting, secure hosting, role-based access. Built by Koniza Information Technology.

> NAMFISA-aligned reporting only — system does not replace accounting, tax, or legal services.

## Stack

- **Backend** — Node.js + TypeScript + Express + PostgreSQL. Scalar API reference at `/docs`.
- **Frontend** — React + Vite + TypeScript + Tailwind CSS.

## Local development

### Prerequisites

- Node.js 20+
- PostgreSQL (a database named `nclms` reachable with the credentials in `backend/.env`)

### Setup

```powershell
# 1. Backend
cd backend
copy .env.example .env       # then fill in the values
npm install
npm run migrate              # apply schema
$env:SEED_ADMIN_EMAIL='admin@konizanam.com'
$env:SEED_ADMIN_PASSWORD='change-me-now'
npm run seed                 # create bootstrap admin
npm run dev

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Then open:

- Public site: http://localhost:3001 (or whatever `vite.config.ts` is set to)
- Admin sign-in: http://localhost:3001/admin/login
- API reference (Scalar): http://localhost:5001/docs
- OpenAPI JSON: http://localhost:5001/openapi.json

## Repository layout

```
backend/         Express + Postgres REST API
  migrations/    Numbered .sql files applied by `npm run migrate`
  src/
    routes/      Express routers (auth, applications, marketing-agents, referrals)
    services/    Domain logic
    schemas/     Zod request schemas
    middleware/  Auth, validation, error handling
    openapi/     OpenAPI spec served at /openapi.json
    lib/         Helpers (jwt, uploads, audit, errors)
  uploads/       Runtime upload destination (gitignored)

frontend/        Vite + React + TS + Tailwind
  public/        Static assets (logo)
  src/
    api/         Typed client wrappers
    components/  Header, Footer, Logo, Field, FileDrop, StatusBadge
    context/     AuthContext (JWT in localStorage)
    pages/       Public + /admin pages
```

## Application + approval flow

1. A microlender submits the public **Apply** form with business details, principal-officer info, founding statement, NAMFISA certificate/approval letter, principal-officer ID, and (optional) member IDs. They may enter a marketing agent's referral code.
2. The application lands in the admin **Applications** queue as `pending`.
3. An admin reviews documents and either **approves** (issues a temporary password and creates an active microlender account at the assigned tier) or **rejects** (with a reason).
4. Every state change is recorded in `nclms_audit_log`.

## Pricing tiers

| Tier | Clients | Monthly | Onboarding | Enhancements | Support calls |
|---|---|---|---|---|---|
| Tier 1 — Starter | 1–500 | N$1,000 | N$2,000 | 1 | 4 / mo |
| Tier 2 — Growth (most popular) | 501–2,500 | N$2,000 | N$3,500 | 2 | 8 / mo |
| Tier 3 — Professional | 2,501–10,000 | N$4,000 | N$5,000 | 3 | 16 / mo |
| Tier 4 — Enterprise | 10,001+ | N$8,000+ | Custom | 4 | Unlimited* |

\* Fair-use policy applies. Pricing excludes VAT and is billed monthly in advance. Optional signature pad: N$5,000 once-off.

## Contact

**Koniza Information Technology**
ERF 6239, Samuel Shikomba Street · Windhoek, Namibia
+264 81 465 7337 · it@konizanam.com · https://it.konizanam.com/
