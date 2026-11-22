# Staff login and guided workflow (v0.4)

This is an **academic, synthetic-data-only** outpatient operations prototype, not a Vinmec system.

## Sign-in troubleshooting

1. Check `/api/health`: the database must be reachable.
2. Check `/api/auth/status`: `staffLoginAvailable: true` confirms that *some* active account exists; it does **not** verify the password or that every demo role is seeded.
3. Demo emails: `manager@demo.local`, `coordinator@demo.local`, `analyst@demo.local`, `admin@demo.local`.
4. Role selection only fills the email field. The password is **not** shown by the UI or derived from the role.
5. Set `DEMO_PASSWORD` privately in Render (at least 16 characters). The seed script upserts demo users with the configured password at deployment startup. For local development, set it in `backend/.env`, then run `npm run db:seed`. **Do not put passwords in the repo or screenshots.**
6. If you changed `DEMO_PASSWORD` on Render, redeploy/restart so the startup seed updates password hashes. Old credentials will no longer work.
7. The login API now counts failed sign-ins rather than every sign-in. Ten consecutive failures for the same IP and email are blocked for 15 minutes in this single-process demo.
8. After login, the UI checks the token against `/api/me`. Expired/invalid sessions return to public preview with a clear message. Bearer tokens remain in sessionStorage and disappear when the tab session ends.

## End-to-end guided workflow

1. **Overview** — check synthetic history, trends, forecast accuracy and capacity constraints.
2. **Forecasting** — choose a target date, compute a transparent weekday/moving-average baseline, optionally adjust demand.
3. **What-if simulation** — compare staffing capacity, gaps, constraints, estimated additional cost, and advisory narrative.
4. **Management decision** — Manager may approve an eligible staffing option or reject the scenario with a rationale; the decision is stored once.

Public visitors can simulate, but cannot save scenarios or decisions. Operations Coordinator and Data Analyst can create and review scenarios; only Manager can approve/reject; Admin does not approve operational decisions. Advisory AI prose cannot change deterministic calculations.

## Validation

CI runs Prisma generation, backend Node tests and frontend/backend TypeScript builds. Live login requires a reachable configured PostgreSQL database and private environment variables and cannot be proven using CI alone.
