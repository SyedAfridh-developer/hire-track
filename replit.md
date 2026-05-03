# HireTrack — Full-Stack Job Portal

A production-ready job portal with two roles: **Candidate** and **Recruiter**.

## Architecture

**Monorepo (pnpm workspaces)**:
- `artifacts/hiretrack` — React + Vite frontend (wouter routing, shadcn/ui, TanStack Query)
- `artifacts/api-server` — Express 5 backend (Drizzle ORM + PostgreSQL, JWT auth)
- `lib/api-spec` — OpenAPI specification (source of truth)
- `lib/api-client-react` — Generated React Query hooks (via Orval)
- `lib/api-zod` — Generated Zod schemas
- `lib/db` — Drizzle schema + migrations

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Wouter, TanStack Query, shadcn/ui, Tailwind v4 |
| Backend | Express 5, Drizzle ORM, PostgreSQL |
| Auth | JWT (bcryptjs + jsonwebtoken), localStorage token storage |
| Charts | Recharts (recruiter dashboard) |
| Forms | react-hook-form + zod |
| Codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |

## Database Schema

Tables: `users`, `profiles`, `companies`, `jobs`, `applications`

- **users**: id, name, email, password_hash, role (candidate|recruiter)
- **profiles**: linked to users (candidate only) — headline, bio, location, phone, skills[], experience[], education[], resumeUrl
- **companies**: linked to users (recruiter only) — name, description, website, location, industry, size
- **jobs**: linked to recruiters + companies — title, description, location, jobType, salaryMin, salaryMax, skills[], isActive
- **applications**: links candidates to jobs — status (applied|shortlisted|rejected|hired), coverLetter, resumeUrl

## Demo Credentials

- **Candidate**: candidate@demo.com / password
- **Recruiter**: recruiter@demo.com / password

## API Routes

All routes prefixed with `/api`:

- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login (returns JWT)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user
- `GET/PUT /api/profile` — Candidate profile
- `POST /api/profile/resume` — Upload resume (base64 PDF)
- `GET/PUT /api/companies/me` — Recruiter's company
- `GET /api/jobs` — List jobs (search/filter/pagination)
- `POST /api/jobs` — Create job (recruiter)
- `GET /api/jobs/featured` — Featured jobs (public)
- `GET /api/jobs/:id` — Job detail
- `PUT /api/jobs/:id` — Update job (recruiter)
- `DELETE /api/jobs/:id` — Delete job (recruiter)
- `GET /api/jobs/:id/applications` — Job applicants (recruiter)
- `POST /api/applications` — Apply for job (candidate)
- `GET /api/applications/me` — My applications (candidate)
- `PUT /api/applications/:id/status` — Update status (recruiter)
- `GET /api/dashboard/recruiter` — Recruiter analytics
- `GET /api/dashboard/candidate` — Candidate stats

## Frontend Pages

**Public**: Landing, Login, Register, Browse Jobs, Job Detail

**Candidate**: Dashboard, Browse Jobs, Job Detail (apply), My Applications, Profile

**Recruiter**: Dashboard, My Jobs (CRUD), Post/Edit Job, Applicants ATS, Company Profile

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (Replit managed)
- `SESSION_SECRET` — JWT secret (falls back to "hiretrack-secret-key" in dev)
- `PORT` — Server port (set by Replit workflow)

## Running Migrations

```bash
pnpm --filter @workspace/db run push
```

## Regenerating API Client

```bash
pnpm --filter @workspace/api-spec run codegen
```
