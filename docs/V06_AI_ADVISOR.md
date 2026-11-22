# Vinmec DSS v0.6 — Visible AI Operations Advisor

## Where to find AI
Click **AI hỗ trợ quyết định** in the fixed left navigation bar (now a first-class tab). It is accessible to public visitors and logged-in staff.

1. Create a demand scenario in **Dự báo & mô phỏng** (choose a day, input or forecast visits, compare staffing), or select an existing saved scenario in the AI tab if logged in.
2. Go to **AI hỗ trợ quyết định** and select the scenario.
3. Select a suggested question or type your own and click **Phân tích kịch bản bằng AI**.
4. The response is clearly labeled as **OpenAI** or **Giải thích dự phòng – không phải AI**, with the fallback reason and numerical evidence supplied by the deterministic DSS backend.

## What AI can and cannot do
OpenAI explains qualitative staffing and capacity tradeoffs, risks, operational uncertainties, and next validation steps. It **does not** forecast patient demand, compute doctor capacity, change staffing decisions, access actual patient data, or approve scenarios. The deterministic DSS engine produces the numbers; human Manager controls approval. The project uses only synthetic aggregates.

## API setup
- The AI endpoint requires login and a saved scenario. Public visitors get a no-cost rule-based explanation and are shown a login link.
- Render needs a valid **OPENAI_API_KEY**, configured in private environment settings (not GitHub) for OpenAI analysis. If the key is missing, invalid, quota-limited, or responses fail verification, the backend uses a deterministic fallback.
- The app displays status from `GET /api/ai/status`. The status reports whether the key is **configured**, not whether live model calls are definitely working.
- The backend requests JSON output from the Responses API and validates fields to reduce silent fallback from malformed output.
- Default `OPENAI_MODEL` is defined in Render configuration; model charges are distinct from ChatGPT Plus and require OpenAI API billing and limits.

## End-to-end test
1. Validate public What-if; go to AI tab; expect rule-based explanation.
2. Sign in as Analyst or Manager; create and save a scenario.
3. Select the scenario in the AI tab; request analysis and verify the label **OpenAI đã phản hồi** only when the backend reports source `OPENAI`.
4. If fallback appears, inspect the visible reason and Render deployment/configuration privately. Do not paste API keys into chat, GitHub or screenshots.
5. Confirm Manager alone approves and AI only explains.

## Report outline note
Update the functional architecture, UI workflow, AI Governance, cost/fallback policy and evaluation test matrix for a dedicated AI Advisor module (v0.6).
