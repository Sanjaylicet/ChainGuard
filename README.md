# ChainGuard Lite

**Testnet-only AI-assisted crypto safety screening powered by The Graph and Hedera x402 agentic payments.**

> ⚠️ **Disclaimer**: This report is an educational screening result based on indexed testnet data. It is not financial advice and does not guarantee that an address or transaction is safe.

---

## Problem

Crypto users and autonomous agents often cannot quickly interpret wallet activity, protocol interactions, or unusual transaction patterns before interacting with an unfamiliar address. The data exists on-chain but it's difficult to query and understand.

## Solution

ChainGuard Lite provides a pay-per-report API:

1. User enters a testnet EVM wallet or protocol address
2. AI agent sends a request to the report API → receives **HTTP 402 Payment Required**
3. Agent signs a small testnet HBAR payment using Hedera x402
4. After payment verification, the service queries **live indexed data from The Graph**
5. A deterministic risk engine scores the evidence
6. An AI model explains the evidence in plain language
7. The browser shows the report, payment timeline, evidence table, and limitations

**This project uses Hedera testnet only. No mainnet funds or mainnet credentials are required or supported.**

---

## Architecture

```
Browser UI (React/Vite)
    │
    │ POST /api/report
    ▼
Agent Server (Express :3001)
    │
    │ POST /v1/safety-report (no payment header)
    ▼
Report Service (Express :4021)
    │
    │ HTTP 402 + payment requirements
    ▼
Agent: sign Hedera testnet HBAR payment
    │
    │ POST /v1/safety-report (with x-payment header)
    ▼
x402 Facilitator (verifies/settles payment)
    │
    ▼
Report Engine
    ├── The Graph (live GraphQL query)
    ├── Risk Engine (deterministic scoring)
    └── AI Report Generator (constrained LLM + fallback)
    │
    ▼
Final JSON report → Agent → Browser
```

---

## The Graph Integration

**Track: Best AI Tooling or AI Use Case with The Graph (From Scratch)**

The Graph is load-bearing — the report cannot be generated without live indexed blockchain data.

### Live GraphQL Query

```graphql
query AddressActivity($address: String!) {
  swaps(
    where: { origin: $address }
    first: 100
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    timestamp
    origin
    recipient
    token0 { id symbol }
    token1 { id symbol }
    amountUSD
  }
  deposits: mints(where: { origin: $address }, first: 50) {
    id
    timestamp
    origin
  }
  withdrawals: burns(where: { origin: $address }, first: 50) {
    id
    timestamp
    origin
  }
}
```

**Subgraph**: Uniswap V3 Arbitrum Sepolia (testnet)  
**Endpoint**: `https://api.studio.thegraph.com/query/48427/uniswap-v3-arbitrum-sepolia/version/latest`

### What the query returns

| Field | Usage in report |
|---|---|
| `swaps[].timestamp` | First/last seen, recent activity burst detection |
| `swaps[].recipient` | Unique counterparty count |
| `swaps[].token0/1` | Protocol interaction count |
| `mints[].timestamp` | Deposit events |
| `burns[].timestamp` | Withdrawal events |

### Why the project depends on The Graph

Without The Graph, we have no way to retrieve normalized, structured on-chain activity for arbitrary wallet addresses in a testnet environment. The indexing allows us to query historical events, counterparties, and timestamps efficiently — far beyond what raw RPC calls would enable.

---

## Hedera x402 Integration

**Track: AI & Agentic Payments on Hedera**

The report API is genuinely x402-gated on Hedera testnet.

### Payment Flow

1. Agent → `POST /v1/safety-report` (no header) → **HTTP 402**
2. Agent reads `x402Version`, `accepts[]`, `maxAmountRequired`, `payToAddress`
3. Agent creates a Hedera testnet `TransferTransaction` (payer → receiver, amount in tinybars)
4. Transaction submitted to Hedera testnet; receipt confirmed
5. Agent retries with `x-payment` header containing transaction proof
6. Report service verifies payment → generates report

### Configuration

```env
HEDERA_NETWORK=testnet
HEDERA_PAYER_ACCOUNT_ID=0.0.XXXXX
HEDERA_PAYER_PRIVATE_KEY=302e...
HEDERA_RECEIVER_ACCOUNT_ID=0.0.YYYYY
X402_PAYMENT_ASSET=HBAR
X402_PRICE=0.001
X402_FACILITATOR_URL=https://facilitator.x402.org
```

---

## Risk Scoring Method

Scoring is deterministic — the AI cannot change the label.

| Condition | Score |
|---|---|
| Fewer than 2 indexed events | +1 concern |
| Recent activity burst (>5 events in 7d) | +1 concern |
| More than 5 unique counterparties | +1 concern |
| Repeated protocol interaction (≥3) | −1 concern |
| Incomplete data | Forces `Needs review` |

**Labels:** `Low signal` (score ≤ 0, complete data) · `Needs review` (score 1 or incomplete) · `High concern` (score ≥ 2)

---

## Environment Variables

See [`.env.example`](.env.example) for the full list.

Required for real payment:
- `HEDERA_PAYER_ACCOUNT_ID`, `HEDERA_PAYER_PRIVATE_KEY` — payer (agent) account
- `HEDERA_RECEIVER_ACCOUNT_ID` — merchant account (report service)
- `DEMO_ONLY_TESTNET=true` — **required, app refuses to start without this**

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — add your Hedera testnet accounts and LLM key

# 3. Verify providers
npm run check:providers

# 4. Run all services
npm run dev
# Opens: Web UI on :5173, Agent on :3001, Report Service on :4021

# 5. Reproduce a paid request
npm run test:paid-request -- --address 0x1f98431c8aD98523631AE4a59f267346ea31F984
```

---

## Reproducing a Paid Request

```bash
npm run test:paid-request -- --address 0xYOUR_TESTNET_ADDRESS
```

Expected output:
```
  ✅ payment_required
  ✅ payment_signed
  ✅ payment_submitted
  ✅ payment_verified
  ✅ report_generated
```

Result saved to `test-paid-result.json`.

---

## Track Qualification Mapping

| Requirement | Implementation |
|---|---|
| Live Graph provider request | `queryAddressActivity()` in `src/packages/graph-client/` |
| Normalized evidence | `NormalizedEvidence` type, post-query normalization |
| AI reasoning over Graph data | `generateReport()` with constrained LLM prompt |
| HTTP 402 without payment | `POST /v1/safety-report` returns 402 |
| Agent signs testnet payment | `buildHederaPaymentHeader()` in `src/agent/payment-client.ts` |
| Payment verified before report | x402 middleware on report route |
| No mainnet code path | `assertTestnetOnly()` guards every service startup |

---

## Security & Testnet Limitations

- Private keys, API keys, and payment signatures are **never logged**
- `.env` is in `.gitignore` — only `.env.example` is committed
- Application refuses to start if `DEMO_ONLY_TESTNET !== 'true'`
- Any `mainnet` string in network config causes immediate startup failure
- This tool only works with Hedera testnet HBAR — zero mainnet risk

---

## Known Limitations

- The Uniswap V3 Arbitrum Sepolia subgraph may have limited data for some testnet addresses
- The x402 facilitator may not support all HBAR testnet configurations; fallback to manual 402 middleware is implemented
- AI explanation requires a valid OpenAI-compatible API key; deterministic fallback is used if unavailable
- Report is based solely on indexed subgraph data, not full on-chain history

---

## License

MIT
