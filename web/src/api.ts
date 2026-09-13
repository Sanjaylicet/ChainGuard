import type { AgentReportResponse } from '../../src/packages/shared/types';

// In production (Vercel), set VITE_AGENT_URL to your ngrok/Railway/Render URL.
// In local dev, Vite's proxy forwards /api → localhost:3001 automatically.
const AGENT_URL = (import.meta.env.VITE_AGENT_URL as string | undefined) || '/api';

export async function requestReport(
  address: string,
  subjectType: 'wallet' | 'protocol'
): Promise<AgentReportResponse> {
  // When routing through ngrok, the free tier shows a browser warning page
  // that intercepts ALL requests including OPTIONS preflight — blocking CORS.
  // Fix: append the bypass param in the URL itself so both OPTIONS and POST
  // requests skip the warning page before reaching the agent server.
  const url = AGENT_URL.startsWith('http')
    ? `${AGENT_URL}/report?ngrok-skip-browser-warning=true`
    : `${AGENT_URL}/report`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ address, subjectType }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data as AgentReportResponse;
}
