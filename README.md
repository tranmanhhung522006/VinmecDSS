# Vinmec DSS · Academic Decision Support Prototype

A public, interactive **academic demonstration** of outpatient demand forecasting and capacity planning, using **synthetic data only**. This project is not affiliated with Vinmec and must not be used for clinical or operational decisions.

## Deployment architecture

- **Render**: One Node.js Web Service hosts both the React frontend and NestJS REST API on the same URL. Configuration lives in [`render.yaml`](render.yaml).
- **Neon**: Managed PostgreSQL stores synthetic daily visits, scenarios, approved/rejected decisions, and AI explanation history.
- **Prisma 6**: Pooled `DATABASE_URL` for application queries and direct `DIRECT_URL` for database schema changes.
- **OpenAI API (optional)**: Backend-only advisory explanations, never used to determine numeric staffing recommendations.

## Public demo and protected features

Visitors can inspect a real database-backed dashboard, run historical forecasts, and compare staffing scenarios. Public requests do not create records, approve decisions, or consume OpenAI API credit.

Protected staff roles can save scenarios and decisions. Only a **MANAGER** can finalize an approval or rejection. The production deployment has **no shared default password**; add a private `DEMO_PASSWORD` in Render to create staff accounts.

## Project structure

```text
VinmecDSS/
├── frontend/                  React + Vite: UI, analytics, AI workspace
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backend/                   NestJS: API, auth, DSS engines and tests
│   ├── src/
│   ├── test/
│   ├── .env.example
│   └── package.json
├── database/                  Prisma schema and synthetic database seed
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── docs/
├── docker-compose.yml
├── render.yaml
└── package.json
```

The three directories separate responsibilities at source-code level. Render still hosts one Node Web Service (API plus built frontend) while PostgreSQL runs on Neon; this does not create three independent production services.

## Local development

Requirements: Node.js 22+, npm, Docker Desktop.

```powershell
Copy-Item backend/.env.example backend/.env
# Edit backend/.env; replace JWT_SECRET with a random 32+ character secret
docker compose up -d
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

In separate terminals:

```powershell
npm run dev:api
npm run dev:web
```

Open http://localhost:5173. The local-only demo password defaults to `VinmecDemo2026!` if `DEMO_PASSWORD` is unset in the local environment. The public visitor experience does **not** require login.

## Validate

```powershell
npm run test
npm run build
```

GitHub Actions runs these checks automatically. A clean build does not by itself prove Neon connectivity or a successful Render deployment; verify those separately.

## Decision-model transparency

The read-only \`GET /api/public/model-catalog\` endpoint returns the implemented forecasting, validation, scenario, capacity planning and AI-advisory models with their limitations. The separate Capacity Planning Lab uses exhaustive enumeration for one constrained staffing variable; it does not replace the existing manager-approved three-option scenario workflow. See [DSS architecture](docs/DSS_ARCHITECTURE.md) and [Capacity Planning Lab](docs/CAPACITY_LAB.md).

## Core algorithm

1. Forecast future visits using mean of up to four matching historical weekdays; fallback to trailing seven days.
2. Adjust a scenario: `demand = round(baseline × (1 + growth% / 100))`.
3. Test staffing alternatives (current doctors, +1, +2) against maximum available doctors and clinic rooms.
4. Compare shortfall, unused capacity, and incremental staffing cost with an explicitly documented academic ranking rule.
5. Review and, if authenticated, save a manager decision.

Illustrative scenario: 200 baseline visits +30% = 260 demand; eight doctors provide 240 slots, nine provide 270, ten provide 300; a nine-doctor plan is ranked highest under these assumptions. This is **not** a verified hospital productivity rate or forecast.

## Security and limitations

- Never commit `.env`, a Neon connection string, API keys, or manager credentials.
- Do not expose real patient data; all seeded records are fictional aggregates.
- Public What-if analyses are **non-persistent**; staff-only saved results are stored in Neon.
- Server-side AI is advisory and limited by `AI_MAX_CALLS` as an application-level safeguard. Set a real billing limit in your OpenAI account; the safeguard is **not** a spending guarantee.
- Role-based authorization is prototype-grade and not suitable for processing real healthcare data; see [`ARCHITECTURE.md`](ARCHITECTURE.md).
- Do **not** confuse the 14-week hypothetical Vinmec implementation plan in the academic report with the software development and deployment steps here.

**Deploy instructions:** [`docs/DEPLOY_RENDER_NEON.md`](docs/DEPLOY_RENDER_NEON.md)