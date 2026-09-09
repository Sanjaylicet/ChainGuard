# ChainGuard Lite — Product Requirements Document

**Live On-Chain Safety Screening, Paid Per Report**
ETHGlobal ETHOnline 2026 Submission

Version: 1.0
Status: Draft — for build execution
Time budget: 2 days

---

## 1. Summary

ChainGuard Lite is a testnet-only AI service that retrieves live blockchain activity through The Graph, turns it into a transparent wallet or protocol safety screening report, and delivers that report only after an AI agent completes a small Hedera testnet x402 payment.

The product is a single workflow: a user enters a testnet wallet address, an agent requests a safety report, the report API returns `402 Payment Required`, the agent signs a small testnet HBAR payment, Hedera x402 verifies/settles it, the service queries live data from The Graph, calculates transparent risk signals, and an AI model turns the evidence into a concise report. The frontend shows the report, payment status, evidence, and limitations.

**Target tracks:**
- The Graph — Best AI Tooling or AI Use Case with The Graph (From Scratch)
- Hedera — AI & Agentic Payments on Hedera
- Optional stretch: Bazantic — Help an Agent Use Your Hackathon Project (only if the main project is complete)

**Network:** Hedera testnet only.

### Product limitation (must appear in the interface)
This is an educational screening tool, not a scam detector, compliance system, investment adviser, or guarantee of transaction safety. The interface must display, verbatim:

> This report is an educational screening result based on indexed testnet data. It is not financial advice and does not guarantee that an address or transaction is safe.

---

## 2. Problem Statement

Crypto users often cannot quickly interpret wallet activity, protocol interactions, transaction frequency, or unusual activity before interacting with an unfamiliar address or protocol. The data exists on-chain, but it's difficult for ordinary users and autonomous agents to query and understand.

---

## 3. Goals & Non-Goals

### Goals
- Retrieve and use **live** data from The Graph — not static fixtures — in the final report.
- Gate the report API behind a real Hedera testnet x402 payment; complete at least one real paid request end to end.
- Convert raw indexed data into transparent, deterministic risk signals, then have an AI model explain (not decide) the evidence.
- Ship a simple, professional one-page browser interface a judge can understand without reading the README.
- Provide a CLI/script that reproduces the paid request for verification.

### Non-Goals — explicitly forbidden for this build
- Mainnet support of any kind, or real fund transfers.
- Trading, swaps, approvals, or portfolio rebalancing.
- Smart-contract deployment (unless absolutely required by an existing x402 setup).
- User accounts, authentication, or social login.
- Database persistence.
- Mobile application.
- Token or NFT issuance.
- DAO or governance features.
- Multi-chain support.
- A custom marketplace.
- A custom Substreams pipeline.
- Complex wallet connection UI.
- A custom scam-label database.
- Any claim that the tool can prove an address is malicious.

**Rule of thumb:** if a feature isn't required for the two selected tracks, don't build it.

---

## 4. Users & Use Case

**Primary actor:** an AI agent making an autonomous, paid request on behalf of a user who wants to understand a wallet or protocol before interacting with it.

**Secondary actor:** the end user, who enters a testnet address into the browser interface and reads the resulting report.

**Core scenario:** user enters an address → agent requests a report → gets `402` → pays testnet HBAR via x402 → Graph data is queried → deterministic risk score is computed → AI explains the evidence in plain language → report renders with full payment and evidence trail visible.

---

## 5. Functional Requirements

### 5.1 Request flow
1. Browser calls `POST /api/report` on the agent server.
2. Agent server sends a request to `POST /v1/safety-report`.
3. Report API returns `HTTP 402` if no payment header exists.
4. Agent client creates and signs the Hedera testnet payment.
5. Agent client retries the request with the x402 payment header.
6. Report API verifies the payment.
7. Report engine queries The Graph.
8. Report engine calculates evidence and risk signals.
9. Report engine calls the LLM with structured evidence.
10. Report API returns the final report.
11. Agent server forwards the report to the browser.

### 5.2 Component responsibilities (kept separate)
- `graphClient` — retrieves and normalizes live data.
- `riskEngine` — calculates deterministic signals.
- `reportGenerator` — creates constrained AI output.
- `paymentServer` — protects the report endpoint.
- `paymentClient` — handles the x402 retry flow.
- `web` — displays the workflow and result.

### 5.3 The Graph integration
- Implement `queryAddressActivity(address)` in a dedicated `graph-client` package, independent of Express and the frontend.
- Validate the address before querying; send the smallest query that returns useful activity fields.
- Normalize the provider response into a stable `NormalizedEvidence` object (see §7.1) before any AI call.
- Handle empty and incomplete results gracefully; add a request timeout (10s); never return raw provider errors to the browser.
- Use a direct GraphQL request to a live Graph provider if the Subgraph MCP path proves unstable — document the fallback either way.

### 5.4 Risk scoring (deterministic, auditable)
- Score is computed from fixed rules (§7.2) — the AI cannot change the deterministic label.
- Risk labels: `Low signal`, `Needs review`, `High concern`. Never use `Scam` or `Malicious`.
- Missing/incomplete required data always forces `Needs review`.

### 5.5 AI report generation
- The LLM receives only structured evidence — never private keys, payment headers, or raw secrets.
- The LLM explains what the evidence suggests and what it cannot prove; it does not decide the risk label.
- Output is constrained to a fixed schema: `summary` (one paragraph), `reasons` (2–3), `recommendedChecks` (2–3), `limitations` (exactly 2).
- If the LLM is unavailable, the service returns a deterministic template report — the app must remain demoable without the LLM.

### 5.6 Payment layer (Hedera x402)
- The report endpoint is a Hedera testnet x402 resource server: unpaid requests get `402`; paid, verified requests get the report.
- Use a dedicated, low-balance testnet payer account — never a funded or shared account.
- Do not implement x402 cryptography manually — reuse a known Hedera x402 example or official SDK pattern.
- Keep the payment amount fixed and small; never log private keys or payment signatures.

### 5.7 Safety interlocks
- The application must refuse to start if `DEMO_ONLY_TESTNET` is not `true`.
- The application must reject environment values containing obvious mainnet configuration (e.g. `mainnet` in any network field).

### 5.8 Frontend (one page)
Required components: header with project name and track technologies; testnet-only status badge; address input; subject-type selector (`Wallet` / `Protocol`); demo-address button; generate-report button; payment progress timeline; risk-label card; summary paragraph; evidence table; reasons list; recommended-checks list; limitations and disclaimer; testnet payment evidence; error message area.

Visual requirements: clean, professional, dark or neutral security-oriented design; green/yellow/red used only as labels, never as a claim of certainty; testnet status obviously visible; no dashboard, charts, account system, or settings page.

---

## 6. System Architecture

```
+----------------------+
|      Browser UI       |
| address + report view |
+----------+-----------+
           |
           | POST /api/report
           v
+----------------------+
|     Agent server       |
|  x402 payment client   |
+----------+-----------+
           |
           | request without payment
           v
+----------------------+
|  Report API service    |
| POST /v1/safety-report |
+----------+-----------+
           |
      HTTP 402 if unpaid
           |
   signed testnet payment
           v
+----------------------+
| Hedera x402 facilitator|
+----------+-----------+
           |
   payment verified/settled
           v
+----------------------+
|     Report engine       |
|   Graph + rules + AI    |
+----------+-----------+
           |
           v
+----------------------+
|   The Graph live data   |
+----------------------+
```

### Recommended repository structure
```
chainguard-lite/
├── apps/
│   ├── agent/            # request → 402 → sign/pay → retry → forward
│   │   └── src/ (server.ts, payment-client.ts, routes.ts)
│   ├── report-service/   # x402-gated report API
│   │   └── src/ (server.ts, payment-server.ts, routes.ts)
│   └── web/               # one-page browser interface
│       └── src/ (App.tsx, api.ts, styles.css)
├── packages/
│   ├── graph-client/      # live Graph query + normalization
│   ├── risk-engine/       # deterministic scoring
│   ├── report-generator/  # constrained AI output + fallback
│   └── shared/            # shared types
├── scripts/
│   ├── test-paid-request.ts
│   └── check-providers.ts
├── docs/
│   ├── ARCHITECTURE.md
│   └── PROVIDER_CHECK.md
├── .env.example
└── README.md
```
A simpler single-app structure is acceptable if it saves time — the separation between payment, data, scoring, and UI matters more than the exact folders.

### Recommended stack

| Layer | Recommendation |
|---|---|
| Language | TypeScript |
| Runtime | Node.js 20+ |
| API server | Express |
| Frontend | Vite + React, or static HTML if React setup is slow |
| Styling | Plain CSS or a small utility stylesheet |
| Blockchain payment | Hedera x402 SDK + facilitator-compatible client |
| Blockchain data | The Graph GraphQL endpoint (Subgraph MCP only if faster to integrate) |
| AI | Existing OpenAI-compatible endpoint or project-provided LLM helper |
| Validation | Zod or simple TypeScript validation |
| Tests | Vitest or Node test scripts |
| Deployment | Localhost for the demo, or one simple public deployment if already available |

Use the official Hedera x402 proof of concept as a reference for package names and payment flow — do not copy its mainnet functionality; remove all mainnet paths from this project.

---

## 7. Data Model & Report Logic

### 7.1 Normalized evidence (post-Graph, pre-AI)
```ts
export type NormalizedEvidence = {
  address: string;
  eventCount: number;
  uniqueCounterparties: number;
  recentEventCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  protocolInteractions: number;
  dataComplete: boolean;
  source: "The Graph";
  queriedAt: string;
};
```

### 7.2 Deterministic scoring rubric

| Condition | Score |
|---|---|
| Fewer than two indexed events | +1 concern |
| Recent activity burst | +1 concern |
| More than five unique counterparties in the demo window | +1 concern |
| Repeated interaction with the selected protocol | −1 concern |
| Missing required data | Forces `Needs review` |

Risk labels: `Low signal` (score ≤ 0 and data complete) · `Needs review` (score 1, or incomplete data) · `High concern` (score ≥ 2).

### 7.3 Request schema — `POST /v1/safety-report`
```json
{
  "address": "0x0000000000000000000000000000000000000000",
  "network": "testnet",
  "subjectType": "wallet"
}
```
Allowed values: `network` — only `testnet`. `subjectType` — `wallet` or `protocol`. `address` — validated as a hexadecimal EVM address.

### 7.4 Paid response schema
```json
{
  "reportId": "demo-2026-001",
  "subject": { "address": "0x...", "network": "testnet", "type": "wallet" },
  "riskLabel": "Needs review",
  "confidence": "limited",
  "summary": "The address has recent indexed activity, but the available data is limited...",
  "reasons": [
    "Recent activity was detected in the selected data source.",
    "The indexed history contains multiple counterparties.",
    "The available evidence is limited to the selected Subgraph schema."
  ],
  "evidence": {
    "eventCount": 12,
    "uniqueCounterparties": 7,
    "recentEventCount": 5,
    "firstSeen": "2026-09-01T10:00:00Z",
    "lastSeen": "2026-09-08T10:00:00Z",
    "dataSource": "The Graph",
    "queriedAt": "2026-09-08T10:00:00Z"
  },
  "recommendedChecks": [
    "Verify the official contract address before interacting.",
    "Avoid unlimited token approvals.",
    "Test with a small amount first."
  ],
  "limitations": [
    "This is not a scam determination.",
    "Indexed blockchain data may be incomplete or delayed."
  ],
  "payment": { "network": "hedera:testnet", "asset": "HBAR", "amount": "0.001", "status": "verified" }
}
```

### 7.5 Agent endpoint — `POST /api/report`
The browser calls this endpoint; it internally handles the x402 retry flow and returns the paid report.

Request:
```json
{ "address": "0x...", "subjectType": "wallet" }
```
Response:
```json
{
  "status": "success",
  "paymentSteps": ["payment_required", "payment_signed", "payment_submitted", "payment_verified", "report_generated"],
  "report": {}
}
```

### 7.6 AI prompt contract
```
You are ChainGuard Lite, an educational crypto safety screening assistant.

Use only the structured evidence provided below. Do not invent facts.
Do not call the subject malicious or safe with certainty.
Do not provide investment advice.
Explain what the evidence suggests and what it cannot prove.
Return valid JSON matching the requested schema.

Required output fields:
- summary: one short paragraph
- reasons: exactly 2 or 3 evidence-based reasons
- recommendedChecks: exactly 2 or 3 practical checks
- limitations: exactly 2 limitations

Structured evidence: {{EVIDENCE_JSON}}
Deterministic label: {{RISK_LABEL}}
```
If the LLM is unavailable, return the deterministic template report.

### 7.7 Environment configuration (`.env.example`)
```
# Application
NODE_ENV=development
AGENT_PORT=3001
REPORT_SERVICE_PORT=4021
WEB_PORT=5173

# The Graph
GRAPH_API_URL=https://YOUR_GRAPH_PROVIDER_ENDPOINT
GRAPH_API_KEY=YOUR_GRAPH_API_KEY
GRAPH_SUBGRAPH_ID=YOUR_SUBGRAPH_ID
GRAPH_NETWORK=testnet

# Hedera testnet payer
HEDERA_NETWORK=testnet
HEDERA_PAYER_ACCOUNT_ID=0.0.REPLACE_ME
HEDERA_PAYER_PRIVATE_KEY=REPLACE_ME
HEDERA_RECEIVER_ACCOUNT_ID=0.0.REPLACE_ME

# x402
X402_PAYMENT_ASSET=HBAR
X402_PRICE=0.001
X402_FACILITATOR_URL=REPLACE_ME

# AI
LLM_API_BASE_URL=REPLACE_ME
LLM_API_KEY=REPLACE_ME
LLM_MODEL=REPLACE_ME

# Safety
DEMO_ONLY_TESTNET=true
```
Never commit real credentials.

---

## 8. Track Requirements Mapping

### 8.1 The Graph — Best AI Tooling or AI Use Case (From Scratch)
The Graph is load-bearing — the report cannot be generated without live indexed blockchain data. Implementation must demonstrate: a live GraphQL request to a Graph provider or the Subgraph MCP; retrieval of structured blockchain entities/events; transformation of raw data into evidence fields; AI reasoning over those fields; a final recommendation more useful than raw query results.

README must include: the exact Graph query/MCP request, provider configuration, returned fields used, a sample response, and an explanation of why the report depends on The Graph.

### 8.2 Hedera — AI & Agentic Payments on Hedera
Hedera is load-bearing — the report API is paid through Hedera testnet x402. Implementation must demonstrate: the API returning `402` when payment is missing; the agent reading the payment requirement; the agent signing a small testnet HBAR payment; the payment verified/settled through an x402 facilitator; the report returned only after payment processing; testnet transaction/facilitator evidence visible in the demo.

README must include: the x402 payment flow, selected testnet network, payment asset and amount, facilitator URL/SDK configuration, payer and receiver roles, and a screenshot/log of a successful paid request.

### 8.3 Bazantic — Help an Agent Use Your Hackathon Project (stretch, optional)
Attempt only after all required functionality is complete.
- Register the report API as an x402 gateway in Bazantic.
- Create a Recipe explaining when an agent should use the report.
- Run the same prompt once without the Recipe and once with it; record whether tool selection or report quality improves.
- Hard stop: if this takes more than 2 hours, stop and return to testing/documentation/demo prep.

---

## 9. Build Plan (2 Days)

### Day 1 — Core integration and end-to-end functionality

**Phase 1 — Project setup and provider validation (2 hrs)**
- Create the repo; init TypeScript and package management.
- Install Express, validation, GraphQL, Hedera x402 deps, and frontend deps.
- Create `.env.example` and `scripts/check-providers.ts`; verify `DEMO_ONLY_TESTNET=true` is enforced.
- Create/configure two Hedera testnet accounts (payer, receiver); fund the payer with a small amount of testnet HBAR.
- Verify the selected x402 facilitator supports the chosen Hedera testnet payment path.
- Verify one live Graph query manually.
- *Acceptance:* `npm install` works; `npm run check:providers` prints a clear result for both The Graph and Hedera; no mainnet URL/credential is required; a live Graph response is saved as a local dev fixture (debugging only); testnet payment config is documented in `docs/PROVIDER_CHECK.md`.

**Phase 2 — Live Graph client (1.5 hrs)**
- Do not proceed to UI work until the provider check confirms a valid Graph response and Hedera testnet config. If Subgraph MCP is unstable, fall back to a direct GraphQL request and document it.
- Build `packages/graph-client`; implement `queryAddressActivity(address)`; validate the address; send the smallest useful query; normalize into `NormalizedEvidence`; handle empty/incomplete results; 10s timeout; never leak raw provider errors to the browser.
- *Acceptance:* valid address → normalized evidence; empty address → zero counts, no crash; invalid address → `400`; timeout → controlled error; response identifies The Graph as the source; runs against a real provider, not only static data.

**Phase 3 — Risk scoring and report generation (2 hrs)**
- Keep the Graph client independent of Express/frontend. Write unit tests for valid data, empty data, and provider failure. No multi-chain support.
- Build `packages/risk-engine` (transparent scoring rules, `RiskLabel` union type) and `packages/report-generator` (constrained AI prompt, JSON validation, deterministic fallback, limitations always included).
- *Acceptance:* same evidence → same deterministic label; incomplete evidence always → `Needs review`; the LLM cannot change the deterministic label; malformed LLM output falls back to a valid report; no report ever uses "guaranteed safe," "scam confirmed," or "financial advice."

**Phase 4 — x402-gated report API (2 hrs)**
- Build `apps/report-service`; implement `POST /v1/safety-report`, returning `402` when the payment header is missing; configure as a Hedera testnet x402 resource server; after verification, call the Graph client and report generator; add request IDs, structured logs, `GET /health`, and safe local-dev CORS.
- Reuse a known Hedera x402 example/SDK pattern — do not implement x402 cryptography manually. Fixed, small payment amount. Never log private keys or signatures.
- *Acceptance:* `GET /health` → `{ "status": "ok", "network": "testnet" }`; unpaid request → `402`; paid request → `200` with a valid report containing live Graph evidence; service cannot start in mainnet mode; logs clearly show payment required → verified → Graph query → report generated.

**Phase 5 — Agent payment client (2 hrs)**
- Build `apps/agent`: request without payment → parse `402` → construct/sign the Hedera testnet payment via the dedicated payer account → retry with the x402 header → return payment lifecycle steps to the frontend. Add `scripts/test-paid-request.ts`.
- *Acceptance:* `npm run test:paid-request -- --address 0xYOUR_TESTNET_ADDRESS` outputs `payment_required → payment_signed → payment_submitted → payment_verified → report_generated`, and returns a valid report or a clearly explained provider error — never a silently faked paid response.

### Day 2 — Interface, testing, documentation, and submission

**Phase 6 — One-page web interface (3 hrs)**
- Build all required components (§5.8). Keep it a single page — no dashboard, charts, account system, or settings page.
- *Acceptance:* a judge can open the app and understand the problem, that The Graph supplies live data, that Hedera testnet x402 is used for payment, that the report is limited/educational, and whether the payment/report succeeded — all without reading the README.

**Phase 7 — Full integration testing (2.5 hrs)**

| Test | Expected result |
|---|---|
| Valid testnet address | Paid report is generated |
| Demo address button | Address populated, report can run |
| Invalid address | `HTTP 400` + friendly message |
| Empty address | Frontend prevents submission |
| Missing payment | API returns `HTTP 402` |
| Insufficient payer balance | Friendly payment failure |
| Graph timeout | Controlled provider error |
| Empty Graph result | `Needs review` report |
| Incomplete Graph result | `Needs review` report with limitation noted |
| LLM unavailable | Deterministic fallback report |
| Mainnet environment value | Application refuses to start |
| Private key accidentally logged | Must not occur |

- *Acceptance:* all tests run from a clean terminal; at least one test is a real paid testnet request — not only mocked payment tests.

**Phase 8 — README and hackathon proof (2 hrs)**
README, in this order: project name + one-sentence description; problem; solution; live demo/local setup; architecture diagram; The Graph integration; Hedera x402 integration; end-to-end payment flow; risk-scoring method; environment variables; how to run locally; how to reproduce a paid request; security/testnet limitations; track qualification mapping; known limitations; license.

Include runnable commands:
```bash
npm install
cp .env.example .env
npm run check:providers
npm run dev
npm run test:paid-request -- --address 0xYOUR_TESTNET_ADDRESS
```
README must clearly state: *"This project uses Hedera testnet only. No mainnet funds or mainnet credentials are required or supported."*

**Phase 9 — Demo video (1.5 hrs)**
Keep it 2–4 minutes. Sequence: explain the problem (15s) → show the app and testnet badge → enter the demo address → click Generate Report → show `402`/payment-required state → show the signed and submitted Hedera testnet payment → show the live Graph evidence → show the generated report → show payment/transaction evidence → explain the two track integrations → state limitations honestly.

Narration reference: *"ChainGuard Lite helps a crypto user interpret unfamiliar wallet activity before interacting with it. The report is powered by live indexed blockchain data from The Graph. The report endpoint is not free: the agent receives HTTP 402, pays a small amount of testnet HBAR through Hedera x402, and then receives the report. The score is transparent, the AI only explains the evidence, and the product does not claim to guarantee safety."*

---

## 10. Build Discipline (for an AI coding agent executing this spec)

1. Work phase by phase; run each phase's acceptance tests before moving on.
2. Do not begin UI polish while the paid API flow is broken.
3. Do not add optional features until the required tracks work.
4. If a provider integration fails for more than 30 minutes, use the documented fallback.
5. Do not replace live Graph data with static data in the final demo.
6. Do not replace the real Hedera payment with a fake success message.
7. Keep every integration small and visible.
8. Prefer a working simple implementation over an ambitious incomplete one.
9. Keep a `BUILD_LOG.md` documenting commands run, errors encountered, and final fixes.
10. Report at the end of each phase in this shape:
```
Phase: <number and name>
Completed: - ...
Verification commands: - ...
Results: - ...
Known issues: - ...
Next phase: - ...
```

### Fallback priority if time runs short
1. Real Hedera testnet x402 payment
2. Real The Graph live query
3. Deterministic evidence and risk scoring
4. Report JSON response
5. Simple browser interface
6. AI explanation
7. Documentation and demo video
8. Optional Bazantic integration

If only six hours remain: drop the optional AI provider and Bazantic, use the deterministic report generator — but never remove the real Graph query or the real Hedera payment; those are the two core track requirements.

---

## 11. Final Acceptance Checklist

**Product**
- [ ] One-page interface works
- [ ] User can enter a testnet address
- [ ] User can generate a report
- [ ] Payment progress is visible
- [ ] Report includes risk label, reasons, evidence, checks, and limitations
- [ ] Testnet-only disclaimer is visible

**The Graph**
- [ ] Live Graph provider request works
- [ ] Raw data is normalized
- [ ] Evidence comes from the live query
- [ ] README shows the query or MCP request
- [ ] The AI performs reasoning over Graph-derived evidence

**Hedera**
- [ ] API returns `402` without payment
- [ ] Agent signs a real testnet payment
- [ ] Facilitator verifies or settles the payment
- [ ] Report is returned after payment processing
- [ ] No mainnet code path is required
- [ ] Payment evidence is available for the video

**Reliability**
- [ ] Invalid address is handled
- [ ] Provider timeout is handled
- [ ] Empty data is handled
- [ ] LLM failure has a fallback
- [ ] Mainnet configuration is rejected
- [ ] Secrets are not committed or logged

**Submission**
- [ ] Public GitHub repository
- [ ] Complete README
- [ ] Architecture diagram
- [ ] Setup instructions
- [ ] Reproducible paid-request command
- [ ] Two-to-four-minute demo video
- [ ] Track mapping included
- [ ] No fake payment or fake live-data claims

---

## 12. References

1. The Graph Subgraph MCP Introduction
2. Hedera and the x402 payment standard
3. Hedera x402 inference pay-per-request proof of concept
4. x402 Quickstart for Buyers
5. Blocky x402 facilitator
6. ETHGlobal ETHOnline 2026 prize tracks
7. The Graph Standardized Subgraphs

**Implementation assumption:** the exact available testnet Subgraph and x402 facilitator configuration must be validated during Phase 1. If the Subgraph MCP is difficult to connect, use a direct live GraphQL request to a Graph provider. If the selected payment asset requires extra setup, use the simplest facilitator-supported testnet asset and document the choice.

---

*ChainGuard Lite is a testnet-only, pay-per-report crypto safety assistant. It uses The Graph to retrieve live indexed blockchain activity, applies transparent screening rules, and uses AI to explain the evidence. An agent pays for each report using Hedera testnet x402, demonstrating a complete machine-to-service payment workflow without mainnet risk or unnecessary protocol complexity.*
