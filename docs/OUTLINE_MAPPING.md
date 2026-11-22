# Requirements-to-implementation mapping (INS3070 outline)

| Outline section | Implementation evidence | Status |
|---|---|---|
| M1 Dashboard | `/api/public/summary` (read-only) or protected `/api/dashboard/summary`, React Overview + Recharts | Implemented in source |
| M2 Forecasting | `forecastByWeekday`, `POST /api/forecasts/run` | Implemented baseline; not yet statistically validated |
| M3 Resource Allocation | `compareAlternatives`, hard bounds for doctors/rooms | Implemented in source |
| M4 What-if Scenario | baseline and percentage controls; public non-persistent preview, staff-only persisted results | Implemented in source |
| M5 Decision Recommendation | eligibility, priority, transparent ranking score | Implemented heuristic; not clinically validated |
| M6 Decision History / Export | Manager approval/rejection persisted, JSON report export | Implemented in source |
| M7 AI Insights | Server-side optional OpenAI Responses API and explicit fallback | Implemented in source; live API not tested |
| Roles | MANAGER / COORDINATOR / ANALYST / ADMIN | Basic JWT role enforcement; not production auth |
| Security / governance | No patient PII in seed, env-based secrets, decision audit | Prototype controls only |
| BYOD | Security discussion in the report; no live BYOD support | Not implemented (outside MVP) |
| 14-week project plan | Project planning deliverables maintained separately | Not implemented as app feature |

This prototype is supplementary evidence and does not substitute for the MS Project, four-sheet Excel workbook, max-1500-word Word report, presentation, or Activity Details document.