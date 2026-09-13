import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { queryAddressActivity, isValidEvmAddress } from '../packages/graph-client';
import { calculateRiskScore } from '../packages/risk-engine';
import { generateReport } from '../packages/report-generator';
import type { SafetyReport } from '../packages/shared/types';

// ============================================================
// Safety Interlocks
// ============================================================
function assertTestnetOnly() {
  if (process.env.DEMO_ONLY_TESTNET !== 'true') {
    console.error('FATAL: DEMO_ONLY_TESTNET must be "true". Refusing to start.');
    process.exit(1);
  }
  const guards = [process.env.HEDERA_NETWORK, process.env.GRAPH_NETWORK];
  for (const v of guards) {
    if (v && v.toLowerCase().includes('mainnet')) {
      console.error(`FATAL: Mainnet config detected ("${v}"). Refusing to start.`);
      process.exit(1);
    }
  }
  console.log('[report-service] ✅ Safety interlocks passed — testnet only.');
}

assertTestnetOnly();

// ============================================================
// Manual 402 middleware (works with or without real Hedera keys)
// ============================================================
function build402Middleware() {
  const price = parseFloat(process.env.X402_PRICE || '0.001');
  const receiverId = process.env.HEDERA_RECEIVER_ACCOUNT_ID || '0.0.DEV_MODE';
  const hasRealCredentials = Boolean(
    process.env.HEDERA_RECEIVER_ACCOUNT_ID &&
    !process.env.HEDERA_RECEIVER_ACCOUNT_ID.includes('REPLACE_ME') &&
    process.env.X402_FACILITATOR_URL
  );

  if (hasRealCredentials) {
    const { paymentMiddlewareFromConfig } = require('@x402/express') as any;
    const { HTTPFacilitatorClient, x402ResourceServer } = require('@x402/core/server') as any;
    const { ExactHederaScheme } = require('@x402/hedera/exact/server') as any;
    const facilitator = new HTTPFacilitatorClient({
      url: process.env.X402_FACILITATOR_URL,
    });
    const server = new x402ResourceServer(facilitator)
      .register('hedera:*', new ExactHederaScheme({
        defaultAssets: {
          'hedera:testnet': { asset: '0.0.0', decimals: 8 },
        },
      }));

    return paymentMiddlewareFromConfig(
      {
        'POST /v1/safety-report': {
          accepts: {
            scheme: 'exact',
            network: 'hedera:testnet',
            payTo: receiverId,
            price,
            description: 'ChainGuard Lite safety report',
            mimeType: 'application/json',
          },
        },
      },
      facilitator,
      [{ network: 'hedera:*', server }],
      undefined,
      undefined,
      false
    );
  }

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const paymentHeader =
      req.headers['x-payment'] ||
      req.headers['x402-payment'];

    if (!paymentHeader || !String(paymentHeader).startsWith('dev-payment-')) {
      // Emit exact structure that @x402/hedera createPartiallySignedTransferTransaction expects
      return res.status(402).json({
        error: 'Payment Required',
        x402Version: 1,
        accepts: [
          {
            scheme: 'exact',
            // CAIP2 format required by @x402/hedera
            network: 'hedera:testnet',
            // Field names as expected by the signer
            amount: String(Math.round(price * 1e8)),
            payTo: receiverId,
            asset: '0.0.0',   // HBAR_ASSET_ID — required as plain string by @x402/hedera isHbarAsset
            // feePayer must be in extra
            extra: {
              feePayer: process.env.HEDERA_PAYER_ACCOUNT_ID || 'dev',
            },
            // Human-readable metadata
            resource: `http://${req.headers.host}${req.path}`,
            description: `ChainGuard Lite safety report — ${price} HBAR`,
            mimeType: 'application/json',
          },
        ],
      });
    }

    (req as any).paymentStatus = 'verified';
    next();
  };
}

// ============================================================
// Request schema
// ============================================================
const ReportRequestSchema = z.object({
  address: z.string().refine(isValidEvmAddress, { message: 'Invalid EVM address format' }),
  network: z.literal('testnet', { errorMap: () => ({ message: 'Only testnet is supported' }) }),
  subjectType: z.enum(['wallet', 'protocol']),
});

// ============================================================
// App
// ============================================================
const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', network: 'testnet', service: 'report-service' });
});

const paymentMw = build402Middleware();

app.post('/v1/safety-report', paymentMw, async (req, res) => {
  const reqId = randomUUID().slice(0, 8);
  console.log(`[${reqId}] POST /v1/safety-report — payment header present`);

  const validation = ReportRequestSchema.safeParse(req.body);
  if (!validation.success) {
    console.warn(`[${reqId}] Validation failed`);
    return res.status(400).json({ error: 'Invalid request', details: validation.error.flatten().fieldErrors });
  }

  const { address, subjectType } = validation.data;

  try {
    // 1. Query The Graph
    console.log(`[${reqId}] Querying The Graph for: ${address}`);
    const evidence = await queryAddressActivity(address);
    console.log(`[${reqId}] Evidence: events=${evidence.eventCount} counterparties=${evidence.uniqueCounterparties} complete=${evidence.dataComplete}`);

    // 2. Deterministic scoring
    const risk = calculateRiskScore(evidence);
    console.log(`[${reqId}] Risk label: ${risk.label} (score=${risk.score})`);

    // 3. AI report generation (with fallback)
    const aiReport = await generateReport(evidence, risk.label);
    console.log(`[${reqId}] Report generated`);

    // 4. Build response
    const report: SafetyReport = {
      reportId: `cg-${reqId}`,
      subject: { address, network: 'testnet', type: subjectType },
      riskLabel: risk.label,
      confidence: risk.confidence,
      summary: aiReport.summary,
      reasons: aiReport.reasons,
      evidence: {
        eventCount: evidence.eventCount,
        uniqueCounterparties: evidence.uniqueCounterparties,
        recentEventCount: evidence.recentEventCount,
        firstSeen: evidence.firstSeen,
        lastSeen: evidence.lastSeen,
        protocolInteractions: evidence.protocolInteractions,
        dataSource: 'The Graph',
        queriedAt: evidence.queriedAt,
      },
      recommendedChecks: aiReport.recommendedChecks,
      limitations: aiReport.limitations,
      payment: {
        network: 'hedera:testnet',
        asset: 'HBAR',
        amount: process.env.X402_PRICE || '0.001',
        status: 'verified',
      },
    };

    return res.json(report);
  } catch (err: any) {
    console.error(`[${reqId}] Error:`, err?.message);
    return res.status(500).json({ error: 'Report generation failed', message: err?.message });
  }
});

const port = parseInt(process.env.REPORT_SERVICE_PORT || '4021', 10);
app.listen(port, () => {
  console.log(`[report-service] 🚀 http://localhost:${port}`);
});

export default app;
