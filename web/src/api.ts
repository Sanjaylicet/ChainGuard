import type { AgentReportResponse } from '../../src/packages/shared/types';

const AGENT_URL = '/api';

export async function requestReport(
  address: string,
  subjectType: 'wallet' | 'protocol'
): Promise<AgentReportResponse> {
  const res = await fetch(`${AGENT_URL}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, subjectType }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data as AgentReportResponse;
}
