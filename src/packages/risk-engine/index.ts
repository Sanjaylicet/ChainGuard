import type { NormalizedEvidence, RiskLabel, RiskScore } from '../shared/types';

// ============================================================
// ChainGuard Lite — Deterministic Risk Engine
// Rules are fixed. AI cannot change the label.
// ============================================================

export function calculateRiskScore(evidence: NormalizedEvidence): RiskScore {
  // Missing/incomplete required data always forces Needs review
  if (!evidence.dataComplete) {
    return {
      label: 'Needs review',
      score: 1,
      confidence: 'none',
      reasons: [
        'The Graph data was incomplete or unavailable for this address.',
        'A complete risk assessment requires indexed on-chain activity.',
      ],
    };
  }

  let score = 0;
  const reasons: string[] = [];

  // Rule 1: Fewer than 2 indexed events → +1 concern
  if (evidence.eventCount < 2) {
    score += 1;
    reasons.push(
      `Very limited on-chain history: only ${evidence.eventCount} indexed event(s) found for this address.`
    );
  }

  // Rule 2: Recent activity burst (>5 events in last 7 days) → +1 concern
  if (evidence.recentEventCount > 5) {
    score += 1;
    reasons.push(
      `Recent activity burst detected: ${evidence.recentEventCount} events in the last 7 days.`
    );
  }

  // Rule 3: More than 5 unique counterparties → +1 concern
  if (evidence.uniqueCounterparties > 5) {
    score += 1;
    reasons.push(
      `High counterparty diversity: ${evidence.uniqueCounterparties} unique addresses interacted with this address.`
    );
  }

  // Rule 4: Repeated protocol interaction → -1 concern
  if (evidence.protocolInteractions >= 3) {
    score -= 1;
    reasons.push(
      `Consistent protocol usage: ${evidence.protocolInteractions} distinct protocol interactions suggest established activity.`
    );
  }

  // Determine label and confidence
  let label: RiskLabel;
  let confidence: RiskScore['confidence'];

  if (score <= 0 && evidence.dataComplete) {
    label = 'Low signal';
    confidence = evidence.eventCount > 5 ? 'high' : 'limited';
  } else if (score >= 2) {
    label = 'High concern';
    confidence = 'limited';
  } else {
    label = 'Needs review';
    confidence = 'limited';
  }

  // If no specific reasons were logged, add a default observation
  if (reasons.length === 0) {
    reasons.push(
      `Address has ${evidence.eventCount} indexed events and ${evidence.uniqueCounterparties} unique counterparties.`
    );
  }

  return { label, score, confidence, reasons };
}

export function getRiskLabelColor(label: RiskLabel): string {
  switch (label) {
    case 'Low signal': return 'green';
    case 'Needs review': return 'yellow';
    case 'High concern': return 'red';
  }
}
