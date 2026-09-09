import { z } from 'zod';
import type { NormalizedEvidence, RiskLabel, AIReport } from '../shared/types';

// ============================================================
// AI prompt contract (constrained — LLM cannot change label)
// ============================================================
const SYSTEM_PROMPT = `You are ChainGuard Lite, an educational crypto safety screening assistant.

Use only the structured evidence provided below. Do not invent facts.
Do not call the subject malicious or safe with certainty.
Do not provide investment advice.
Explain what the evidence suggests and what it cannot prove.
Return valid JSON matching the requested schema exactly.

Required output fields:
- summary: one short paragraph (2-4 sentences)
- reasons: exactly 2 or 3 evidence-based reasons (array of strings)
- recommendedChecks: exactly 2 or 3 practical checks a user should perform (array of strings)
- limitations: exactly 2 limitations of this report (array of strings)

IMPORTANT: Do not include any markdown, code fences, or explanation outside the JSON object.`;

// ============================================================
// AI output schema validation
// ============================================================
const AIOutputSchema = z.object({
  summary: z.string().min(10).max(1000),
  reasons: z.array(z.string()).min(2).max(3),
  recommendedChecks: z.array(z.string()).min(2).max(3),
  limitations: z.array(z.string()).length(2),
});

// ============================================================
// Deterministic fallback report (used when LLM unavailable)
// ============================================================
function buildFallbackReport(
  evidence: NormalizedEvidence,
  label: RiskLabel
): AIReport {
  const hasActivity = evidence.eventCount > 0;
  const summaryMap: Record<RiskLabel, string> = {
    'Low signal':
      `This address shows ${evidence.eventCount} indexed event(s) from The Graph with ${evidence.uniqueCounterparties} unique counterparties and ${evidence.protocolInteractions} protocol interaction(s). ` +
      `The available evidence does not raise specific concerns, but the dataset is limited to the selected testnet subgraph. ` +
      `This is an educational screening result only.`,
    'Needs review':
      `This address has ${hasActivity ? evidence.eventCount + ' indexed event(s)' : 'no indexed events'} in The Graph dataset. ` +
      `The limited or incomplete data prevents a clear assessment. ` +
      `Additional manual verification is strongly recommended before interacting.`,
    'High concern':
      `This address exhibits multiple signals that warrant careful review: ${evidence.eventCount} total events, ` +
      `${evidence.uniqueCounterparties} unique counterparties, and ${evidence.recentEventCount} recent events in the last 7 days. ` +
      `This is not a determination of fraud — it indicates the address has activity patterns that deserve further scrutiny.`,
  };

  return {
    summary: summaryMap[label],
    reasons: [
      `The Graph indexed ${evidence.eventCount} event(s) for this address as of ${new Date(evidence.queriedAt).toLocaleDateString()}.`,
      `${evidence.uniqueCounterparties} unique counterparty address(es) were found in the indexed activity.`,
      ...(evidence.recentEventCount > 0
        ? [`${evidence.recentEventCount} event(s) occurred in the past 7 days.`]
        : []),
    ].slice(0, 3),
    recommendedChecks: [
      'Verify the address on a blockchain explorer (e.g., Arbiscan for Arbitrum Sepolia testnet).',
      'Cross-check the address against the official protocol documentation before interacting.',
      'Start with a minimal test interaction before committing any significant funds.',
    ].slice(0, 3),
    limitations: [
      'This report is based only on indexed testnet subgraph data and may not reflect the full on-chain history.',
      'This is not a scam determination, fraud audit, or financial advice — always do your own research.',
    ],
  };
}

// ============================================================
// Main export: generateReport
// ============================================================
export async function generateReport(
  evidence: NormalizedEvidence,
  label: RiskLabel
): Promise<AIReport> {
  const apiBase = process.env.LLM_API_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  // If no LLM configured, use deterministic fallback immediately
  if (!apiBase || !apiKey || apiKey.includes('REPLACE_ME')) {
    console.info('[report-generator] LLM not configured — using deterministic fallback report.');
    return buildFallbackReport(evidence, label);
  }

  const userPrompt = `Structured evidence:
${JSON.stringify(evidence, null, 2)}

Deterministic label: ${label}

Generate the educational screening report as a JSON object with keys: summary, reasons, recommendedChecks, limitations.`;

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}`);
    }

    const completion = await response.json() as any;
    const raw = completion?.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty LLM response');

    // Parse JSON — strip markdown fences if present
    const jsonStr = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = AIOutputSchema.safeParse(JSON.parse(jsonStr));

    if (!parsed.success) {
      console.warn('[report-generator] LLM output failed schema validation:', parsed.error.message);
      return buildFallbackReport(evidence, label);
    }

    return parsed.data;
  } catch (err: any) {
    console.warn('[report-generator] LLM unavailable or failed, using fallback:', err?.message);
    return buildFallbackReport(evidence, label);
  }
}
