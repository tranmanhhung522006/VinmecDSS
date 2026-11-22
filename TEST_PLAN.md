# Minimum acceptance test plan

1. TC01 — Log in as `manager@demo.local`. Dashboard loads and header shows MANAGER.
2. TC02 — Recent synthetic visit totals are retrieved from PostgreSQL (not hard-coded in browser).
3. TC03 — Forecast 2026-11-23 uses weekday mean or trailing moving-average baseline.
4. TC04 — Scenario baseline 200, growth 30% yields demand 260 and an 8-doctor shortage of 20.
5. TC05 — 8, 9, 10 doctors produce 240, 270, 300 capacity; with room limit 10, 9 should be recommended.
6. TC06 — With no `OPENAI_API_KEY`, Generate explanation returns labeled `RULE_BASED_FALLBACK`.
7. TC07 — Manager approves a valid alternative with rationale, then sees persisted decision.
8. TC08 — A coordinator's approval attempt returns HTTP 403. A second decision returns HTTP 409.
9. TC09 — API failure or missing model permission does not break core DSS; fallback is displayed.
10. TC10 — Export JSON captures assumptions, alternatives, recommendation, and final decision.

**Additional tests not yet executed here:** live PostgreSQL integration test, browser E2E, API authorization fuzzing, hard rate limiting and OpenAI response grounding.