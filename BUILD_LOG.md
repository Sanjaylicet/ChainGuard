# BUILD_LOG.md — ChainGuard Lite

## Phase 1 — Setup and Provider Validation

**Date**: 2026-09-08

### Commands run
```bash
npm install
npm run check:providers
```

### Results
- `npm install` successful (523 packages)
- `DEMO_ONLY_TESTNET=true` enforced — app refuses to start without it
- The Graph provider OPERATIONAL (Uniswap V3 Arbitrum Sepolia testnet subgraph)
- Hedera credentials pending (need real testnet account IDs in .env)

### Issues
- `@hedera/sdk` is not on npm — correct package is `@hashgraph/sdk` ✅ fixed
- protobufjs peer dependency conflict (warning only, not blocking) ✅ resolved with `--legacy-peer-deps` implicitly
- Initial Graph query returned 0 records (empty subgraph for some queries) ✅ switched to token query for verification

---

## Phase 2 — Live Graph Client and Risk Scoring

**Date**: 2026-09-09

### Files created
- `src/packages/shared/types.ts` — all shared TypeScript types
- `src/packages/graph-client/index.ts` — live GraphQL query + normalization
- `src/packages/risk-engine/index.ts` — deterministic scoring engine
- `src/packages/report-generator/index.ts` — constrained AI report + fallback

### Design decisions
- Address-level query uses `swaps(where: { origin: $address })` — most Uniswap V3 subgraphs support this
- Fallback to simple token query if address-specific query fails (schema mismatch)
- 10-second timeout enforced on all Graph requests
- AI output validated against Zod schema; malformed JSON falls back to deterministic report

---

## Phase 3 — x402-Gated Report Service

**Date**: 2026-09-09

### Files created
- `src/report-service/server.ts` — Express + x402 middleware + report generation pipeline

### Design decisions
- DEV bypass mode: if Hedera credentials are REPLACE_ME, any `x-payment` header passes through (for local dev without real accounts)
- Uses `@x402/express` + `@x402/hedera` when credentials are configured
- Falls back to manual 402 middleware if x402/express throws on import
- Never logs private keys or payment headers

---

## Phase 4 — Agent Payment Client

**Date**: 2026-09-09

### Files created
- `src/agent/payment-client.ts` — Hedera SDK payment + x402 header construction
- `src/agent/server.ts` — Express agent server
- `scripts/test-paid-request.ts` — CLI reproducer

### Design decisions
- Dev mode (no real keys): returns synthetic payment header for bypass
- Real mode: creates `TransferTransaction`, executes, wraps proof in x402 header
- Payment lifecycle steps tracked and returned to frontend

---

## Phase 5 — Web Interface

**Date**: 2026-09-09

### Files created
- `web/index.html`, `web/vite.config.ts`
- `web/src/main.tsx`, `web/src/App.tsx`, `web/src/api.ts`, `web/src/styles.css`

### Design decisions
- Dark security-oriented design with Inter + JetBrains Mono fonts
- Payment progress timeline shows all 5 steps with live state
- Demo address pre-fills the Uniswap V3 Factory (widely indexed on testnet)
- Disclaimer displayed in both the input card and report limitations section
- Vite proxy forwards `/api/*` to agent server to avoid CORS issues

---

## Known Issues / Future Work

1. x402 Hedera facilitator compatibility needs validation with real account keys
2. `wrapPaymentInHeader` API from `@x402/hedera` needs to be confirmed against exact package export names
3. TypeScript module resolution: `"module": "NodeNext"` requires `.js` extensions on imports — all imports updated
