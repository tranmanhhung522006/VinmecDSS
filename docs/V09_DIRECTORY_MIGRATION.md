# v0.9 — Frontend / Backend / Database migration

## Mapping
| Previous | New |
|---|---|
| `apps/web/` | `frontend/` |
| `apps/api/src/`, `apps/api/test/` | `backend/src/`, `backend/test/` |
| `apps/api/.env.example` | `backend/.env.example` |
| `apps/api/prisma/schema.prisma` | `database/prisma/schema.prisma` |
| `apps/api/prisma/seed.ts` | `database/prisma/seed.ts` |

Source code moved without changing tables or data. No database migration is introduced.

## Local PowerShell
```powershell
Copy-Item backend/.env.example backend/.env
# Configure JWT_SECRET 32+ chars and local DATABASE_URL/DIRECT_URL
docker compose up -d
npm install --include=dev
npm run db:generate
npm run db:validate
npm run db:push
npm run db:seed
npm run dev:backend
# In another shell:
npm run dev:frontend
```

Root scripts `dev:api` and `dev:web` remain as backward-compatible aliases. `npm run build` builds both apps.

Local address: frontend http://localhost:5173, backend http://localhost:4000/api/health, Docker PostgreSQL localhost:5433.

## Deployment
The single Render service builds the frontend and backend and serves both from the NestJS process. The PostgreSQL process is hosted separately by Neon. Prisma CLI always reads `database/prisma/schema.prisma` from the backend npm workspace.

**Do not run Prisma db push on production without reviewing the generated schema delta.** This change does not itself alter the schema or touch database content.

## Verification
Run CI: Prisma generate and validate; API tests and build; Vite build. Browser smoke-test login, session switching, capacity lab, forecast, role-gated approval, dashboard and static asset routes. This directory change alone does not guarantee a deployed application.
