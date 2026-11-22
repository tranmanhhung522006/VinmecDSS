# Forecast model comparison — synthetic academic demonstration

Adds a non-persistent comparison alongside the existing baseline forecasting workflow.

## Method
- Three fixed baselines: mean of up to four prior matching weekdays (fallback to trailing 7 days when fewer than two weekdays exist), trailing 7-day mean, and simple exponential smoothing (alpha 0.35).
- All models are tested on the same last 21 eligible historical dates (or fewer when history is short). Each prediction is calculated using only **earlier** observations; never train on a test day.
- Choose the model with the lowest walk-forward **MAE**, break ties by RMSE and a stable defined model order. Each score includes MAE, RMSE, MAPE where actual counts are nonzero, bias and a descriptive p90 historical absolute error.
- The chosen model generates a target-date forecast. A **descriptive** ±p90 absolute-error envelope is shown. It is not a calibrated prediction interval, statistical confidence bound, or safety guarantee.

## Boundaries
- Works on synthetic daily demand only. Excludes holidays, local specialty case mix, medical acuity, staffing history and booking queues.
- `POST /api/public/forecast-comparison` is read-only: it does not save a ForecastRun, alter the existing managed scenario workflow, use an LLM or approve a recommendation.
- The UI appears under Methodology; this feature intentionally retains the **shared role dashboard**.

## Acceptance
- Run `npm run db:generate`, `npm run db:validate`, `npm run test`, `npm run build`.
- Try a future date with sufficient seed history; verify that all three models use the same sample count.
- Try a date without ten prior aggregate days and confirm a descriptive validation error.
- Verify the actual date is not used as training input and that zero-visit days do not trigger division by zero.
- Manually inspect desktop/mobile layouts and compare the model selected with the reported MAE.
- Keep the primary scenario forecast mechanism unchanged until its integration is separately designed and tested.

The academic report outline remains unchanged until the user explicitly requests revisions.
