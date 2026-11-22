# Synthetic visit-history editing in Dự báo & mô phỏng

## Workflow
1. Open Dự báo & mô phỏng → Dữ liệu lượt khám lịch sử. Everyone can see the last 120 stored days in read-only format.
2. Manager/Admin signs in, chooses a past or current Vietnam-local date and enters aggregate morning and afternoon visits.
3. Backend validates actor role, date, visit bounds and updates exactly two slots within a transaction; records an old/new audit entry.
4. The UI reloads historical rows, refreshes summary + forecast quality, and clears an old transient forecast.
5. Go to Phương pháp & quản trị AI → Forecast Model Evaluation, choose a day after the updated observation, and run all 3 models.

## Boundaries
- Historical visits are synthetic aggregates only. Never enter private patient identifiers or actual clinical records.
- Entering baseline demand and growth rate in scenario input still creates a simulation, NOT a historical observation.
- Public can read. Analyst/Coordinator can read. Manager/Admin may write; backend role checks are mandatory.
- The existing unique key (departmentId, day, slot) prevents duplicates; slots are 08:00-12:00 and 13:00-17:00.
- Forecast comparison still uses only records BEFORE the target date. Existing saved results are not automatically recalculated.
- This implementation supports manual single-day add/edit; CSV/Excel import is not included.

## Deployment and acceptance
- Back up Neon. Prisma adds the VisitHistoryChange table. Existing Render startup uses db:push; switch to reviewed migrations for production.
- Run npm run db:generate, npm run db:validate, npm run test, npm run build.
- Test public read, Analyst forbidden write (403), Manager/Admin write, invalid/future date (400), duplicate-free update, audit entry, and new forecast after next-day selection.
- Confirm actual Render and Neon connectivity separately; CI success does not prove deployment.
