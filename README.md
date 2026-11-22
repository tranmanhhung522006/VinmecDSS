# Vinmec DSS — Hospital Operations Decision Support Prototype

**INS3070 academic project · Independent demonstration · Not affiliated with Vinmec**

Full-stack prototype for analyzing synthetic outpatient demand, staffing capacity, scenario alternatives, managerial approval, and optional AI-based explanations.

## Stack

- React + Vite + TypeScript + Recharts (`apps/web`)
- NestJS REST API (`apps/api`)
- PostgreSQL + Prisma (`apps/api/prisma`)
- Optional OpenAI Responses API for advisory explanations
- Docker Compose for local PostgreSQL

## Quick start (Node.js 20+ and Docker Desktop)

From the repository root:

```bash
cp apps/api/.env.example apps/api/.env
# On PowerShell: Copy-Item apps/api/.env.example apps/api/.env
# Edit apps/api/.env and set a strong JWT_SECRET
docker compose up -d
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

Start the API and frontend in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

Open http://localhost:5173 (API: http://localhost:4000/api).

## Demo access — local only

Seed accounts: `manager@demo.local`, `coordinator@demo.local`, `analyst@demo.local`, `admin@demo.local`.
The initial password is `VinmecDemo2026!`, unless `DEMO_PASSWORD` was set during seeding.
**Change demo credentials before any deployment.**

## How the DSS works

1. Reads synthetic outpatient visit aggregates from PostgreSQL.
2. Forecasts demand using previous matching weekdays or a moving average.
3. Compares staffing scenarios subject to doctor and room availability.
4. Explains capacity, shortfall, cost and selection criteria.
5. Lets a manager approve or reject one alternative and persists that decision.
6. Optionally calls OpenAI for an advisory explanation, with labeled fallback.

Example (fictional): baseline 200, +30% growth = 260 forecast visits. Eight, nine and ten doctors provide capacity for 240, 270, and 300 visits/day under the simplified assumption of 30 visits per doctor. The model recommends nine doctors in this case.

## OpenAI API (optional)

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in `apps/api/.env` only. Never expose API keys in frontend code, git, or screenshots. The model is given synthetic aggregate scenarios, not patient identities. `AI_MAX_CALLS` is a soft application safeguard, not a billing hard cap.

## Verification

```bash
npm run test
npm run build
```

The deterministic calculation tests were checked when this source was prepared; complete end-to-end installation and deployment have not yet been verified.

## Limitations

This is an academic demo with fictional data. It is not a clinical decision support device, not connected to EMR/HIS, and must not be used for real hospital scheduling, treatment, or patient care.

See `ARCHITECTURE.md`, `QUICK_START_WINDOWS.md`, `TEST_PLAN.md`, `VALIDATION.md` and `docs/OUTLINE_MAPPING.md`.
The prototype supplements the mandatory slides, MS Project, Excel, Word report and Activity Details.
