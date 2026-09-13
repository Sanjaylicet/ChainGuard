import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { fetchReportWithPayment } from './payment-client';

// ============================================================
// Safety Interlocks
// ============================================================
if (process.env.DEMO_ONLY_TESTNET !== 'true') {
  console.error('FATAL: DEMO_ONLY_TESTNET must be "true". Refusing to start.');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-payment', 'x402-payment', 'ngrok-skip-browser-warning'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
// Explicitly handle OPTIONS preflight for all routes
app.options('*', cors());

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', network: 'testnet', service: 'agent' });
});

// ============================================================
// Agent report endpoint — called by the browser
// ============================================================
const AgentRequestSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  subjectType: z.enum(['wallet', 'protocol']).default('wallet'),
});

app.post('/api/report', async (req, res) => {
  const validation = AgentRequestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request',
      details: validation.error.flatten().fieldErrors,
    });
  }

  const { address, subjectType } = validation.data;
  console.log(`[agent] Requesting report for ${address} (${subjectType})`);

  try {
    const result = await fetchReportWithPayment(address, subjectType);
    return res.json(result);
  } catch (err: any) {
    console.error('[agent] Error fetching report:', err?.message);
    return res.status(502).json({
      status: 'error',
      paymentSteps: [],
      error: err?.message || 'Agent failed to fetch report',
    });
  }
});

const port = parseInt(process.env.AGENT_PORT || '3001', 10);
app.listen(port, () => {
  console.log(`[agent] 🚀 Running on http://localhost:${port}`);
});

export default app;
