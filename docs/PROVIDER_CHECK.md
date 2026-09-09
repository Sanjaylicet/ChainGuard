# ChainGuard Lite — Provider Verification Document

## Overview
This document records the initial setup and provider validation performed during Phase 1 of ChainGuard Lite development for ETHOnline 2026.

## 1. Safety & Environment Rules
- **DEMO_ONLY_TESTNET**: Enforced as `true`. The application refuses to start if this is missing or set to `false`.
- **Mainnet Prohibition**: Network fields containing `mainnet` are explicitly rejected by runtime guardrails in code.
- **Credentials Handling**: All secrets are stored strictly in `.env` (never committed to git). `.env.example` serves as the public schema template.

## 2. The Graph Integration Check
- **Data Source**: Live Graph GraphQL provider / Subgraph indexing testnet EVM activity (Arbitrum Sepolia).
- **Endpoint**: `https://api.studio.thegraph.com/query/48427/uniswap-v3-arbitrum-sepolia/version/latest` (configured via `GRAPH_API_URL`).
- **Live Query Status**: Verified. Live response received and fixture stored at `docs/fixtures/sample-graph-response.json`.
- **Live Query Used**: Queries `tokens(first:5)` for connectivity verification; address queries use `swaps(where:{origin:$address})` for real evidence.

## 3. Hedera Testnet x402 Integration Check
- **Network**: Hedera Testnet (`testnet`).
- **Asset**: HBAR.
- **Payment Standard**: x402 specification using `@x402/core`, `@x402/express`, `@x402/hedera`.
- **Facilitator**: `https://facilitator.x402.org`
- **Accounts Required**:
  - `HEDERA_PAYER_ACCOUNT_ID` — Agent payer account (testnet only)
  - `HEDERA_PAYER_PRIVATE_KEY` — Key for signing HBAR micropayments
  - `HEDERA_RECEIVER_ACCOUNT_ID` — Merchant/service account receiving payment

## 4. Verification Command
```bash
npm run check:providers
```
