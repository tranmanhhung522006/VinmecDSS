# Minimum acceptance test plan

1. TC01 — Open public URL without login; dashboard loads real synthetic aggregates and VIEWER mode.
2. TC02 — Public dashboard totals come from PostgreSQL, not hard-coded browser data.
3. TC03 — Public forecast runs without creating a ForecastRun row, using weekday mean or moving-average baseline.
4. TC04 — Scenario baseline 200, growth 30% yields demand 260 and an 8-doctor shortage of 20.
5. TC05 — 8, 9, 10 doctors produce 240, 270, 300 capacity; with room limit 10, 9 should be recommended.
6. TC06 — With no `OPENAI_API_KEY`, Generate explanation returns labeled `RULE_BASED_FALLBACK`.
7. TC07 — Public scenario is not saved; manager logs in using privately configured password and approves a saved alternative.
8. TC08 — A coordinator's approval attempt returns HTTP 403. A second decision returns HTTP 409.
9. TC09 — API failure or missing model permission does not break core DSS; fallback is displayed.
10. TC10 — Public report export contains local preview facts; authenticated report includes persisted decisions.

**Additional tests not yet executed here:** live PostgreSQL integration test, browser E2E, API authorization fuzzing, hard rate limiting and OpenAI response grounding.