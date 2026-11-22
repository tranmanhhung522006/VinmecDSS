# Capacity Planning Lab — v0.8

## Purpose and boundary
This lab performs a **read-only, non-persistent** what-if analysis of outpatient staffing on **synthetic aggregate assumptions**. It does not change scenario/decision records, shift assignments, hospital systems, or patient records.

## Exact enumerative decision engine
`apps/api/src/planning.engine.ts` implements complete enumeration for **one integer decision variable**: staffing count from 1 to `min(availableDoctors, rooms)`. For this bounded scope, the search visits every feasible candidate. It is not Google OR-Tools and does not solve multishift assignments.

For each candidate:
- physical capacity = doctors × assumed visits per doctor per day
- planned capacity = floor(physical capacity × user-selected utilization target / 100)
- planning shortfall = max(0, simulated demand − planned capacity)
- additional cost = max(0, doctors − baseline roster) × user-supplied marginal staffing cost

**Ranking is lexicographic:** lowest planning shortfall, then lowest **additional** cost, then fewest doctors. This is a transparent **planning preference**, not a medically validated optimum. Staffing reductions are **not counted as proven savings**. A 90% planning target is merely a selected simulation parameter, not a patient-safety benchmark.

## API contract
`POST /api/public/capacity-lab` (unauthenticated, bounded, non-persistent)

Request example:
```json
{
  "baselineDemand": 200,
  "growthPercent": 30,
  "targetUtilizationPercent": 100,
  "availableDoctors": 10,
  "rooms": 10,
  "visitsPerDoctor": 30,
  "extraDoctorCost": 900000
}
```
All override fields except `baselineDemand`, `growthPercent` and `targetUtilizationPercent` are optional. Omitted values come from the seeded department.

Response: `inputs`, `options`, `current`, `recommended`, `sensitivity`, `warnings`, `searchSpace`, `synthetic:true`, `persisted:false`.

## User flow
Dashboard → Capacity Planning Lab → adjust demand and resource constraints → Calculate → inspect all staffing options, planning-vs-physical capacity chart, five demand sensitivity scenarios and transparent ranking → export CSV if desired.

## Quality controls
- DTO validation rejects invalid types, fractional staff and oversized parameters.
- Engine rejects impossible ranges and never contacts AI or writes to the database.
- Unit tests cover full enumeration, room constraints, utilization targets, additional cost and sensitivity.
- Existing scenario workflow and managerial approval remain isolated.
- Intended later extension: real shift, department, skill and availability constraints using OR-Tools CP-SAT after validation and governance review: https://developers.google.com/optimization/scheduling/employee_scheduling

## Limitations
Does not estimate wait time, acuity, specialty match, provider break times, clinical appropriateness, wages actually payable or forecast uncertainty. Never use it to schedule hospital resources in live operations.
