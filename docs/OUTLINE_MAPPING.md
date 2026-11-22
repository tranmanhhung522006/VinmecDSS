# Requirements-to-implementation mapping (INS3070)

| Requirement | Implementation evidence | Status and limitations |
|---|---|---|
| M1 Dashboard | `OperationsDashboard`, `GET /api/public/summary` | Implemented; synthetic aggregates only |
| M2 Forecasting | `forecastByWeekday`, `rollingForecastBacktest`, public/staff endpoints | Simple weekday and moving-average baselines; not validated on real data |
| M3 Resource Allocation | `compareAlternatives`, `optimizeCapacity` | Three-option protected heuristic and separate exhaustive capacity lab |
| M4 What-if | `POST /api/public/evaluate`, `POST /api/public/capacity-lab`, AI intent parsing | Read-only public previews; optional protected chat |
| M5 Recommendation | Transparent rankings and resource constraints | Academic heuristic, not a medical or multi-shift optimizer |
| M6 Decision History and Export | Prisma `Decision`, manager approval/rejection, JSON and CSV exports | Single-finalization role gate; audit controls are prototype-grade |
| M7 AI Insights | Backend OpenAI Responses API, structured parsing, fallback | Optional, advisory; not fact-proof clinical reasoning |
| M8 Model management | `GET /api/public/model-catalog`, `models/model.catalog.ts` | Metadata catalog; model/version binding per decision not yet persisted |
| M9 Architecture | `server.ts` composition root; controllers, DTO, infrastructure, security modules | Initial modular-monolith separation; large protected controller remains |
| Roles and governance | JWT guard, manager-only approval, synthetic seed, API call budget | Not hospital production auth; MFA/SSO/rate limiting needed |
| Test evidence | Node tests + GitHub Actions | Source and CI checks only, manual E2E pending |

## Report maintenance

Any functional change requires updating the report outline, diagrams, screenshots/appendices and mapping. Document the distinct **legacy scenario model** vs **capacity lab model** accurately. Include the architecture diagram, model catalog, objective function, sensitivity analysis and test cases in implementation/evaluation sections.

This prototype supports INS3070 course deliverables, but does not substitute for the separate project planning/report/presentation artifacts.
