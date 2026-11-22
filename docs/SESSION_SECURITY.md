# Staff session security · Implementation v0.12

This change keeps the shared role-based DSS dashboard and adds **server-side session revocation** without modifying dashboard roles, simulated planning engines, or saved decision records.

## Behavior

- A successful staff login creates a unique JWT (`jti`) with eight-hour expiry, hashes the whole token with SHA-256, and stores only the digest, user reference, expiry, and revocation timestamp in PostgreSQL.
- Every protected request requires **both** a valid signed JWT and an active, non-expired matching database session. Deactivating a user still blocks access.
- `POST /api/auth/logout` revokes the current token's session. A replayed JWT should then return HTTP 401.
- The frontend attempts server-side revocation when switching accounts or returning to public preview, and immediately clears local session state; if the network is down, it cannot guarantee server revocation. This limitation must be stated.
- The existing failed-login limiter now checks both per-IP and IP+email buckets. This is still **in-process only**, not a distributed or complete abuse prevention solution.

## Database rollout

Prisma adds `AuthSession`. The existing Render startup uses `npm run db:push`, which can create the table on deploy. **Back up the database first** and ensure schema changes deploy before testing logins. Previously issued JWTs have no stored session and become invalid after rollout; users must sign in again.

For production, replace `db push` with reviewed Prisma migrations, store sessions with expiration cleanup, use a distributed rate limiter, CSRF-aware HttpOnly cookie-based auth or another vetted session mechanism, and run security scans. This remains an academic prototype and must not process actual patient records.

## Acceptance

- `npm run db:generate`, `npm run db:validate`, `npm run test`, `npm run build`.
- Login with Manager then `GET /api/me` returns 200.
- Logout with `POST /api/auth/logout`, then `GET /api/me` using the same token returns 401.
- Concurrent sessions: logging out one token should not revoke other active sessions.
- Invalid/expired/revoked tokens return 401; disabled users are refused.
- Switching from Manager to Analyst should not leave the old token usable after successful revocation.
- Confirm login workflow in Render+Neon after deployment. GitHub CI is a static check, not a live DB test.

**Report outline is intentionally unchanged at the user's request.**
