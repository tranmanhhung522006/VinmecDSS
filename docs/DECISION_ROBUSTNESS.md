# Decision Robustness · 5 × 5 Stress Testing

## Purpose

Extends the existing **read-only Capacity Planning Lab**, not the persisted three-option scenario workflow. It helps a manager compare an inexpensive base staffing choice with a risk-averse staffing choice before making a human decision.

## Inputs and computation

- The capacity optimizer first returns the recommended number of doctors under a single baseline demand assumption.
- The stress-testing engine varies two independent inputs: daily visit demand and assumed visits per doctor, each by **−20%, −10%, 0%, +10%, +20%**, yielding **25 deterministic scenarios**.
- All outcomes retain the same staff availability, clinic room limits, and target utilization. Each candidate fixed doctor count is evaluated across the **same 25 cases**.
- The risk-averse ranking prefers (1) the largest number of cases with zero planned shortfall, (2) the smallest worst-case planned shortfall, (3) the smallest mean planned shortfall, and only then (4) the smallest additional staffing cost and doctor count.
- The baseline recommendation is **not overwritten**. The API exposes both side by side as `robustness.base` and `robustness.robust`, with 25 individual shortfall pairs and complete ranked options.

## Example (fictional assumptions)

Demand = 260 visits/day; current staffing = 8 doctors; availability and rooms = 10 each; productivity = 30 visits/doctor/day; added staffing cost = 900,000 VND/doctor/day; target utilization = 100%. The baseline capacity optimizer recommends 9 doctors, and the stress-test's risk-averse rule prefers 10. Both are illustrations, not actual hospital staffing recommendations.

## UI

The Capacity Planning Lab now shows:
1. Existing baseline optimizer and five-point demand-only sensitivity table unchanged.
2. A dedicated **Decision Robustness** panel comparing both fixed staffing alternatives.
3. A 5×5 matrix of *planned shortfalls* for the base alternative.
4. Downloadable CSV files for capacity options and for all 25 two-factor cases (both staffing alternatives).

## Governance

This is **scenario stress testing**, not probabilistic risk modeling, Monte Carlo, causal inference, a statistical confidence interval, medically validated optimization or AI forecasting. The displayed share of test cases covered is not a patient-service probability. Cases have equal descriptive weight only; the manager must confirm risk preferences. No actual patients, specialty mix, shift roster, acuity or queue times are modeled. OpenAI has no write access to model outputs; the new endpoint does not call the model, persist input, or approve anything.

## Verification

- `npm run db:generate`
- `npm test`
- `npm run build`
- CI on the proposed pull request, then manual browser inspection at desktop and mobile sizes.
- Confirm anonymous `POST /api/public/capacity-lab` returns `robustness.casesEvaluated: 25` and that the screen renders and both CSV files download.

This enhancement is based on the `refactor/v09-separate-frontend-backend-database` branch. Merge that directory migration before this feature PR to avoid overwriting architecture changes.
