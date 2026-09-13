import { describe, expect, it } from 'vitest';
import { calculateRiskScore } from './index';
import type { NormalizedEvidence } from '../shared/types';

function evidence(overrides: Partial<NormalizedEvidence> = {}): NormalizedEvidence {
  return {
    address: '0x0000000000000000000000000000000000000001',
    eventCount: 10,
    uniqueCounterparties: 2,
    recentEventCount: 1,
    firstSeen: '2026-01-01T00:00:00.000Z',
    lastSeen: '2026-09-01T00:00:00.000Z',
    protocolInteractions: 3,
    dataComplete: true,
    source: 'The Graph',
    queriedAt: '2026-09-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('calculateRiskScore', () => {
  it('returns Low signal for complete, established activity', () => {
    expect(calculateRiskScore(evidence()).label).toBe('Low signal');
  });

  it('returns High concern when multiple concern rules apply', () => {
    const result = calculateRiskScore(evidence({
      eventCount: 1,
      recentEventCount: 6,
      uniqueCounterparties: 6,
      protocolInteractions: 0,
    }));

    expect(result.label).toBe('High concern');
    expect(result.score).toBe(3);
  });

  it('forces Needs review when evidence is incomplete', () => {
    const result = calculateRiskScore(evidence({ dataComplete: false }));

    expect(result.label).toBe('Needs review');
    expect(result.confidence).toBe('none');
  });
});