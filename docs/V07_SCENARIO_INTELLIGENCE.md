# Vinmec DSS v0.7 — Scenario intelligence with OpenAI and deterministic What-if

## Functional changes

The **AI hỗ trợ quyết định** sidebar now includes multi-turn conversation per selected scenario, Vietnamese natural-language What-if, role-aware AI status, operational risk analysis, and decision briefs.

**Trust boundary**
- OpenAI is only a language interface. Demand, doctor capacity, eligibility, incremental cost and ranked alternatives are computed solely by \`apps/api/src/dss.engine.ts\`.
- The OpenAI intent extractor (when necessary) produces a strictly typed intent; the server checks numeric ranges before any calculation.
- Common Vietnamese requests such as \`Nếu nhu cầu tăng thêm 20% thì sao?\` are recognized locally without a paid intent classification call.
- A What-if simulation is **not persisted** and **never approved** by AI. The existing Manager-only decision endpoint is unchanged.
- Model responses use a JSON schema with answer, warnings and nextActions; no forced 4-heading reply. The server visibly marks OpenAI, deterministic fallback and in-memory cache.
- Only synthetic aggregates may be sent to the model. An input guard blocks obvious names of patient identifiers, email and phone strings; this is not certified DLP and real patient data must not be entered.

## How to test

1. Sign in as \`analyst@demo.local\`, \`coordinator@demo.local\` or \`manager@demo.local\` using the privately configured DEMO_PASSWORD.
2. Save a synthetic scenario in **Dự báo & mô phỏng**.
3. Open **AI hỗ trợ quyết định**, select the scenario, and ask: **Nếu nhu cầu tăng thêm 20% thì cần bao nhiêu bác sĩ?**
4. Verify the calculated What-if table is consistent: original 260 visits → new 312 visits; 10 doctors offer 300 visits, so even the top feasible option has a gap of 12 in the default sample data.
5. Ask a follow-up such as **Nếu thêm 1 phòng thì sao?** and observe the newly simulated room constraint. The conversation history contains only the last few turns and is not stored in a persistent database.
6. Ask for a short Manager decision brief. The model cannot approve; only a MANAGER can submit /api/decisions.
7. Repeating an identical question/context may produce a cached answer without an extra model call. The response is labeled accordingly.

## OpenAI configuration

Use Render private environment variables: \`OPENAI_API_KEY\`, \`OPENAI_MODEL\` (default \`gpt-4.1-mini\`), \`AI_MAX_CALLS\` (max 60 attempts/day per server instance). The model and API use **separate billing from ChatGPT Plus**.

The API first tries a local intent parser. More complex instructions can be classified with an OpenAI JSON-schema response. An additional model call generates a narrative based on verified DSS evidence, including simulated results. Missing keys, quota limits, malformed outputs or timeouts fall back to targeted deterministic explanations, not hallucinated figures.

**Cost limitations**: request attempts are tracked in process, not a distributed/transactional billing ledger; concurrent replicas will require Redis or a DB budget counter. The existing /api/ai/status reports verified stored OpenAI insights, not the number of attempted tokens; treat it as approximate and monitor the OpenAI API usage dashboard for actual charges.

## Report outline update

Update Requirement Analysis and System Design to include the NL What-if intent adapter, validation boundary, role-aware conversational UI, in-memory cache and fallback. Update AI Governance and Testing for prompt injection, no patient data, quantitative grounding, budget exhaustion, manager approval, and schema validation.

**Academic disclaimer**: no real Vinmec data, clinical advice, patient records or real operational deployment claims.
