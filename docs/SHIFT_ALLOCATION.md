# Three-window doctor-slot planning lab

This implementation is an **academic decision-support demonstration** over synthetic aggregate outpatient demand. It does not use real hospital data, identify employees, or assign doctors to actual shifts.

## Architecture and data flow

1. `frontend/src/components/ShiftAllocationLab.tsx` gathers three independent demand windows and explicit bounds.
2. `POST /api/public/shift-allocation` validates each window through nested DTO constraints. It does not persist requests or invoke OpenAI.
3. `backend/src/shift.engine.ts` enumerates all nonnegative integer allocations `(morning, afternoon, evening)`, subject to the per-window minimum of available doctors and rooms and the sum of doctor-slots not exceeding the global budget.
4. The engine ranks by **least total planned shortfall**, then **least incremental staffing cost**, then **fewest total doctor-shifts**. It presents a separate, deliberately simple round-robin reference allocation to make the trade-offs visible.
5. The interface displays proposed allocations, shortfalls, costs and a CSV export. The human manager remains the final decision maker.

## Example

Synthetic input: morning 150 visits (max 6 doctors), afternoon 90 (max 5), evening 30 (max 3); productivity = 30 visits per doctor-slot; room ceilings equal doctor maxima; available budget = 10 doctor-slots; baseline = 8 slots; incremental cost = 300,000 VND per extra slot; target utilization = 100%.

Expected choice: 5 + 3 + 1 = **9 doctor-slots**, 270 planned visits, no planned shortfall, and a 300,000 VND incremental cost relative to the eight-slot reference.

## Non-goals / limitations

- Doctor-slots are **not** distinct people: an individual appearing in two slots would count twice. The optimizer has no staff identities, qualification, medical acuity, equipment, mandatory rest, payroll, duration, overlapping shift, or clinic queue constraints.
- Window-level throughput is hypothetical. No validation against real hospital performance.
- The model is deterministic exhaustive search, not CP-SAT, stochastic optimization, a hospital scheduling system, or clinical decision making.
- It intentionally does not create a decision or approval record and cannot replace the existing protected manager workflow.

## Acceptance checks

- `npm run db:generate`, `npm run db:validate`, `npm run test`, `npm run build`.
- Verify `POST /api/public/shift-allocation` returns three assignments and `feasibleCombinationCount > 0`.
- Ensure invalid nested inputs return HTTP 400 via global ValidationPipe.
- Verify navigation works in public and staff modes; test desktop and mobile layouts; export the CSV.
- Check authenticated manager workflow is unchanged.

Stacked dependency: PR #8 -> PR #9 -> PR #10. Report outline remains unchanged until explicitly requested.
