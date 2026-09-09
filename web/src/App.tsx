import React, { useState } from 'react';
import { requestReport } from './api.js';
import type { AgentReportResponse, PaymentStep, SafetyReport } from '../../src/packages/shared/types';

// ============================================================
// Demo addresses (Arbitrum Sepolia testnet)
// ============================================================
const DEMO_ADDRESS = '0x1f98431c8aD98523631AE4a59f267346ea31F984'; // Uniswap V3 Factory

const ALL_PAYMENT_STEPS: PaymentStep[] = [
  'payment_required',
  'payment_signed',
  'payment_submitted',
  'payment_verified',
  'report_generated',
];

const STEP_LABELS: Record<PaymentStep, string> = {
  payment_required: '402 Payment Required received',
  payment_signed: 'HBAR payment signed by agent',
  payment_submitted: 'Transaction submitted to Hedera testnet',
  payment_verified: 'Payment verified by x402 facilitator',
  report_generated: 'Report generated from live Graph data',
};

// ============================================================
// Risk label helpers
// ============================================================
function getRiskClass(label?: string) {
  if (label === 'Low signal') return 'low';
  if (label === 'High concern') return 'concern';
  return 'review';
}

function getRiskIcon(label?: string) {
  if (label === 'Low signal') return '🟢';
  if (label === 'High concern') return '🔴';
  return '🟡';
}

// ============================================================
// Timeline component
// ============================================================
function PaymentTimeline({ completedSteps, isLoading }: { completedSteps: PaymentStep[]; isLoading: boolean }) {
  return (
    <div className="timeline">
      {ALL_PAYMENT_STEPS.map((step, i) => {
        const isDone = completedSteps.includes(step);
        const isActive = !isDone && isLoading && completedSteps.length === i;
        const state = isDone ? 'done' : isActive ? 'active' : 'pending';
        return (
          <div key={step} className={`timeline-step ${state}`}>
            <div className={`timeline-dot ${state}`}>
              {isDone ? '✓' : i + 1}
            </div>
            <span className={`timeline-label ${state}`}>{STEP_LABELS[step]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Report display
// ============================================================
function ReportDisplay({ report }: { report: SafetyReport }) {
  const riskClass = getRiskClass(report.riskLabel);
  const riskIcon = getRiskIcon(report.riskLabel);

  return (
    <>
      {/* Risk Label */}
      <div className={`risk-card ${riskClass}`}>
        <div className="risk-icon">{riskIcon}</div>
        <div>
          <div className="risk-label">{report.riskLabel}</div>
          <div className="risk-meta">Confidence: {report.confidence} · Report ID: {report.reportId}</div>
        </div>
      </div>

      {/* Summary */}
      <div className="card">
        <div className="card-title">📋 Summary</div>
        <p className="summary-text">{report.summary}</p>
      </div>

      {/* Evidence */}
      <div className="card">
        <div className="card-title">📊 On-Chain Evidence <span style={{ color: 'var(--accent-purple)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>from The Graph</span></div>
        <table className="evidence-table">
          <tbody>
            <tr><td>Total indexed events</td><td>{report.evidence.eventCount}</td></tr>
            <tr><td>Unique counterparties</td><td>{report.evidence.uniqueCounterparties}</td></tr>
            <tr><td>Recent events (7d)</td><td>{report.evidence.recentEventCount}</td></tr>
            <tr><td>Protocol interactions</td><td>{report.evidence.protocolInteractions}</td></tr>
            <tr><td>First seen</td><td>{report.evidence.firstSeen ? new Date(report.evidence.firstSeen).toLocaleDateString() : '—'}</td></tr>
            <tr><td>Last seen</td><td>{report.evidence.lastSeen ? new Date(report.evidence.lastSeen).toLocaleDateString() : '—'}</td></tr>
            <tr><td>Data source</td><td>{report.evidence.dataSource}</td></tr>
            <tr><td>Queried at</td><td>{new Date(report.evidence.queriedAt).toLocaleString()}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Reasons */}
      <div className="card">
        <div className="card-title">🔍 Screening Reasons</div>
        <ul className="report-list">
          {report.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      {/* Recommended Checks */}
      <div className="card">
        <div className="card-title">✅ Recommended Checks</div>
        <ul className="report-list">
          {report.recommendedChecks.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>

      {/* Limitations */}
      <div className="card">
        <div className="card-title">⚠️ Limitations</div>
        <ul className="report-list limit-list">
          {report.limitations.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
        <div className="disclaimer" style={{ marginTop: 16 }}>
          <strong>⚠ Educational Disclaimer</strong>
          This report is an educational screening result based on indexed testnet data. It is not financial advice and does not guarantee that an address or transaction is safe.
        </div>
      </div>

      {/* Payment Evidence */}
      <div className="card">
        <div className="card-title">💳 Payment Evidence</div>
        <div className="payment-evidence">
          <div><span>Network</span>{report.payment.network}</div>
          <div><span>Asset</span>{report.payment.asset}</div>
          <div><span>Amount</span>{report.payment.amount} HBAR</div>
          <div><span>Status</span>{report.payment.status}</div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Main App
// ============================================================
export default function App() {
  const [address, setAddress] = useState('');
  const [subjectType, setSubjectType] = useState<'wallet' | 'protocol'>('wallet');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AgentReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<PaymentStep[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);
    setCompletedSteps([]);

    try {
      const response = await requestReport(address.trim(), subjectType);
      setCompletedSteps(response.paymentSteps || []);
      setResult(response);
      if (response.status === 'error') {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch report. Is the agent server running?');
    } finally {
      setIsLoading(false);
    }
  };

  const showTimeline = isLoading || (result !== null);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <div className="header-icon">🛡</div>
          <div>
            <div className="header-title">ChainGuard Lite</div>
            <div className="header-subtitle">AI-assisted crypto safety screening</div>
          </div>
        </div>
        <div className="header-badges">
          <span className="badge badge-testnet"><span className="badge-dot" />TESTNET ONLY</span>
          <span className="badge badge-graph">The Graph</span>
          <span className="badge badge-hedera">Hedera x402</span>
        </div>
      </header>

      {/* ── Input Card ── */}
      <div className="card">
        <div className="card-title">🔍 Address Screening</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="address-input">
              Testnet EVM Address
              <button
                type="button"
                className="demo-btn"
                style={{ marginLeft: 8 }}
                onClick={() => setAddress(DEMO_ADDRESS)}
              >
                use demo address
              </button>
            </label>
            <input
              id="address-input"
              className="form-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x1f98431c8aD98523631AE4a59f267346ea31F984"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subject Type</label>
            <div className="select-group">
              <button
                type="button"
                id="type-wallet"
                className={`select-btn${subjectType === 'wallet' ? ' active' : ''}`}
                onClick={() => setSubjectType('wallet')}
              >
                🏦 Wallet
              </button>
              <button
                type="button"
                id="type-protocol"
                className={`select-btn${subjectType === 'protocol' ? ' active' : ''}`}
                onClick={() => setSubjectType('protocol')}
              >
                ⚙️ Protocol
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="generate-report-btn"
            className={`btn-primary${isLoading ? ' loading' : ''}`}
            disabled={isLoading || !address.trim()}
          >
            {isLoading ? 'Generating Report via Hedera x402…' : '⚡ Generate Safety Report'}
          </button>
        </form>

        <div className="disclaimer" style={{ marginTop: 14 }}>
          <strong>⚠ Testnet Only</strong>
          This tool uses live testnet blockchain data from The Graph. All payments are made in testnet HBAR. No mainnet funds are used.
        </div>
      </div>

      {/* ── Payment Timeline ── */}
      {showTimeline && (
        <div className="card">
          <div className="card-title">💳 Payment Progress</div>
          <PaymentTimeline completedSteps={completedSteps} isLoading={isLoading} />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="error-box">
          <strong>Error</strong>
          {error}
        </div>
      )}

      {/* ── Report ── */}
      {result?.status === 'success' && result.report && (
        <ReportDisplay report={result.report} />
      )}
    </div>
  );
}
