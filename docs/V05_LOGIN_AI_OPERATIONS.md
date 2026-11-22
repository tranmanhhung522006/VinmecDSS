# v0.5 — Login, Operations Dashboard and AI Advisory

This remains an academic prototype with **synthetic aggregate visits only**. It is NOT an official Vinmec product or clinical decision system.

## Fix: switch accounts in one click
- On authenticated screens, **Đổi tài khoản / Đăng xuất** now clears the cached bearer token, private scenarios and AI analysis, then opens the sign-in screen immediately. Users do **not** need to sign out and sign in through two separate screens.
- **Quay lại bản demo công khai** explicitly leaves the account and restores a visitor session.
- Session generation keys prevent obsolete asynchronous responses from a prior account from overwriting the new account.
- The current login screen verifies the token using **GET /api/me** before granting access.

## Fixed sidebar, navigation, and dashboard
- Desktop navigation is sticky for viewport height. The switch-account action stays at the bottom of the visible sidebar. A top-bar account button is also available.
- Mobile navigation has an expandable menu and the account button remains accessible in the top bar.
- Dashboard highlights outpatient visits, simulated daily doctor capacity, resource utilization, pending scenarios, peak demand, room/doctor constraints, and model accuracy.
- The 4-stage workflow is visible immediately. Scenarios can be opened from the decision history.

## AI operations advisor
- **OpenAI API** runs on the backend for authenticated staff only and **only if** `OPENAI_API_KEY` is configured.
- The backend assembles trusted deterministic DSS evidence and passes the staff question as *untrusted input*; no patient information is used.
- The model is tasked with four qualitative fields: assessment, trade-off, risk, and next step. Numeric facts are shown independently from backend evidence. A response with invalid JSON or digits fails closed to a deterministic fallback.
- System-wide daily request allowance: `AI_MAX_CALLS` (maximum 60); no more than 3 paid explanations per scenario per UTC day. A per-day status endpoint reports configured/remaining quota, not the API key.
- Model errors, timeouts, bad outputs, missing API keys or exceeded quota return a rule-based explanation. AI cannot modify scenarios, the recommendation, or decisions.

## Quick verification
1. Confirm GitHub Actions test/build passes; Render deploys the latest main commit.
2. Visit `/api/health`, then the public dashboard.
3. Sign in as Manager; click **Đổi tài khoản / Đăng xuất** once. The login form must appear immediately. Sign in as Analyst and verify no stale Manager scenarios appear.
4. Scroll down to the AI card: left navigation and account switch must remain reachable.
5. Create a scenario and inspect the operations chart/alternative table. Generate an explanation. Check that the source is marked OpenAI or deterministic fallback.
6. Only Manager can approve/reject; Analyst, Coordinator and Admin cannot submit approvals.
7. On Render, configure `OPENAI_API_KEY` privately and optionally `OPENAI_MODEL`, `AI_MAX_CALLS`. No key should ever appear in client JavaScript.

## Limitations
GitHub Actions validates code, not actual Render/Neon credentials or the OpenAI account's billing status. Actual production login and model availability require a live smoke test. Any real hospital deployment requires a dedicated data-governance review, verified authorization, rate-limiting storage, monitoring, and clinical governance.

## Report outline update
Update the Vinmec DSS report outline's Functional Modules (login/session management, fixed responsive navigation, dashboard KPIs, AI Advisor), architecture, AI governance, and test matrix to reflect v0.5.
