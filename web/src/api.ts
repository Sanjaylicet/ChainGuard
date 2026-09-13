import type { AgentReportResponse } from '../../src/packages/shared/types';

// In production (Vercel), set VITE_AGENT_URL to your ngrok/Railway/Render URL.
// In local dev, Vite's proxy forwards /api → localhost:3001 automatically.
const AGENT_URL = (import.meta.env.VITE_AGENT_URL as string | undefined) || '/api';

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
