# Persisted DSS studies and managerial review (academic workflow)

## Scope
This feature adds a durable workflow for both the existing **Capacity Planning Lab** and **three-window Shift Allocation Lab**, while retaining the common dashboard for every staff role.

1. Public visitors can continue to run read-only, non-persistent simulations.
2. Staff (except ADMIN) can save a named analysis from a lab after evaluating inputs.
3. The API **validates the model input DTO and recomputes the entire result on the backend**; browser-computed results are never trusted for stored decisions.
4. The database stores an immutable input and output snapshot with model ID, version, author, and creation timestamp.
5. Manager can approve/reject a study once, providing a reason of at least ten characters. The `StudyReview.studyId @unique` constraint prevents duplicate finalization even if requests race.
6. The staff-only "Hồ sơ phân tích & duyệt" tab shows pending and finalized studies for a human review.

## Architecture
- Database schema: `DecisionStudy`, `StudyReview`, `StudyKind`.
- Backend: `POST /api/studies`, `GET /api/studies`, `GET /api/studies/:id`, `POST /api/studies/:id/review`. All protected by JWT.
- Frontend: lab save buttons and `StudiesInbox`. No new role-specific dashboard.
- Existing scenario approval and its three-option model are unchanged and coexist with this independent analysis-review track.

## Important boundaries
- Manager approval means **academic review of a synthetic recommendation**, NOT deployment of staff, medical care or a real hospital decision.
- Model inputs and outputs are database JSON snapshots. Model metadata is currently a semantic version string, not full reproducibility across DB seed and runtime changes; exact code commit and provenance should be added before production.
- Author and review records are immutable at the application endpoint level (no update/delete API for the studies), but stronger database audit controls and operator permissions are future work.
- The approval does not trigger a schedule or integrate into live staffing systems.
- Do not send real patient information.

## Testing and rollout
- `npm run db:generate && npm run db:validate && npm run test && npm run build`.
- Back up Neon database before applying the additive Prisma schema change in Render.
- Test Manager/Coordinator/Analyst save access; ADMIN cannot submit; VIEWER cannot access staff endpoints.
- Test Manager approval and rejection; other staff must receive HTTP 403.
- Try approving a study twice and expect HTTP 409.
- Confirm browser results match the stored server-computed output, including constraints and warnings.
- GitHub CI does **not** prove live database connectivity or successful Render deployment.

This PR is intentionally independent of session-security PR #11; both change Prisma's User model and will need a careful merge/rebase before they are combined. Do **not** claim integration completed until the combined migration and CI pass.

The report outline is unchanged pending the user's explicit request.
