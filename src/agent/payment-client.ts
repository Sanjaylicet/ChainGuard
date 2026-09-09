import 'dotenv/config';
import type { SafetyReport, PaymentStep, AgentReportResponse } from '../packages/shared/types';

const REPORT_SERVICE_URL = `http://localhost:${process.env.REPORT_SERVICE_PORT || 4021}`;

// ============================================================
// Build signed x402 payment payload using @x402/hedera
// createPartiallySignedTransferTransaction requires:
//   { network (CAIP2), amount, payTo, asset, extra: { feePayer } }
// ============================================================
async function buildHederaPaymentHeader(paymentRequirements: any): Promise<string> {
  const payerId = process.env.HEDERA_PAYER_ACCOUNT_ID;
  const payerKey = process.env.HEDERA_PAYER_PRIVATE_KEY;

  if (!payerId || payerId.includes('REPLACE_ME') || !payerKey || payerKey.includes('REPLACE_ME')) {
    console.log('[payment-client] Dev mode: synthetic payment header (no real HEDERA keys).');
    return `dev-payment-${Date.now()}`;
  }

  const { createClientHederaSigner, HEDERA_TESTNET_CAIP2, PrivateKey } = await import('@x402/hedera');

  const key = PrivateKey.fromString(payerKey);
  const signer = createClientHederaSigner(payerId, key, { network: HEDERA_TESTNET_CAIP2 });

  // Accept entry from 402 response — already in correct @x402/hedera shape
  const accept = paymentRequirements?.accepts?.[0];
  if (!accept) throw new Error('No payment accept entry in 402 response');

  // Build requirements exactly as the signer expects
  const signerRequirements = {
    network: accept.network || HEDERA_TESTNET_CAIP2,   // "hedera:testnet"
    amount: accept.amount || accept.maxAmountRequired,   // tinybars as string
    payTo: accept.payTo || accept.payToAddress,          // receiver account ID
    asset: accept.asset,                                  // { address: 'HBAR', decimals: 8 }
    extra: accept.extra || { feePayer: payerId },         // must contain feePayer
  };

  console.log('[payment-client] Signing HBAR payment:',
    `${signerRequirements.amount} tinybars → ${signerRequirements.payTo}`,
    `(feePayer: ${signerRequirements.extra?.feePayer})`
  );

  const signedTx = await signer.createPartiallySignedTransferTransaction(signerRequirements);
  console.log('[payment-client] ✅ HBAR payment signed');

  // Serialize signed transaction → base64 string for the payment header
  if (typeof signedTx === 'string') return signedTx;
  if (signedTx && typeof (signedTx as any).toBytes === 'function') {
    return Buffer.from((signedTx as any).toBytes()).toString('base64');
  }
  return Buffer.from(JSON.stringify(signedTx)).toString('base64');
}

// ============================================================
// Full x402 payment flow: unpaid → 402 → sign → retry → report
// ============================================================
export async function fetchReportWithPayment(
  address: string,
  subjectType: 'wallet' | 'protocol'
): Promise<AgentReportResponse> {
  const steps: PaymentStep[] = [];
  const body = JSON.stringify({ address, network: 'testnet', subjectType });

  // ── Step 1: Unpaid request ──
  console.log('[payment-client] Step 1: Sending unpaid request...');
  const firstResponse = await fetch(`${REPORT_SERVICE_URL}/v1/safety-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (firstResponse.ok) {
    // Dev bypass — server returned 200 without payment
    const report = await firstResponse.json() as SafetyReport;
    steps.push('report_generated');
    return { status: 'success', paymentSteps: steps, report };
  }

  if (firstResponse.status !== 402) {
    const text = await firstResponse.text();
    throw new Error(`Unexpected status ${firstResponse.status}: ${text}`);
  }

  steps.push('payment_required');
  const paymentRequirements = await firstResponse.json();
  console.log('[payment-client] ✅ 402 Payment Required received');

  // ── Step 2: Sign payment ──
  console.log('[payment-client] Step 2: Signing Hedera testnet payment...');
  let paymentHeader: string;
  try {
    paymentHeader = await buildHederaPaymentHeader(paymentRequirements);
    steps.push('payment_signed');
    steps.push('payment_submitted');
    console.log('[payment-client] ✅ Payment signed and submitted to Hedera testnet');
  } catch (err: any) {
    return { status: 'error', paymentSteps: steps, error: `Payment failed: ${err?.message}` };
  }

  // ── Step 3: Retry with signed payment header ──
  console.log('[payment-client] Step 3: Retrying with x402 payment header...');
  const paidResponse = await fetch(`${REPORT_SERVICE_URL}/v1/safety-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment': paymentHeader,
      'x402-payment': paymentHeader,
    },
    body,
  });

  if (!paidResponse.ok) {
    const text = await paidResponse.text();
    return { status: 'error', paymentSteps: steps, error: `Service returned ${paidResponse.status}: ${text}` };
  }

  steps.push('payment_verified');
  const report = await paidResponse.json() as SafetyReport;
  steps.push('report_generated');
  console.log('[payment-client] ✅ Report received successfully');

  return { status: 'success', paymentSteps: steps, report };
}
