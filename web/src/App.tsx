import React, { useState } from 'react';
import { requestReport } from './api.js';
import type { AgentReportResponse, PaymentStep, SafetyReport } from '../../src/packages/shared/types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const DEMO_ADDRESSES = [
  '0x1f98431c8aD98523631AE4a59f267346ea31F984', // Uniswap V3 Factory
  '0x3e72812e4fa5a5446f73a658b6907d0e1852d27f', // Arbitrum Sepolia Token
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH / Mock Pair
];

const ALL_PAYMENT_STEPS: PaymentStep[] = [
  'payment_required',
  'payment_signed',
  'payment_submitted',
  'payment_verified',
  'report_generated',
];

const STEP_META: Record<PaymentStep, { label: string; description: string; extra: string }> = {
  payment_required: {
    label: 'payment_required',
    description: 'HTTP 402 challenge issued from /v1/safety-report.',
    extra: 'Cost: 0.001 HBAR',
  },
  payment_signed: {
    label: 'payment_signed',
    description: '100,000 tinybars cryptographically signed by payer 0.0.8231465.',
    extra: 'SDK: @x402/hedera',
  },
  payment_submitted: {
    label: 'payment_submitted',
    description: 'Hedera consensus layer broadcast verified.',
    extra: 'HashScan',
  },
  payment_verified: {
    label: 'payment_verified',
    description: 'Payment confirmed by decentralized x402 facilitator node.',
    extra: 'Latency: ~418ms',
  },
  report_generated: {
    label: 'report_generated',
    description: 'The Graph queried + deterministic safety synthesis delivered.',
    extra: 'Status: Ready',
  },
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getRiskStyle(label?: string) {
  if (label === 'Low signal') return { bg: 'bg-tertiary-fixed/60', text: 'text-on-tertiary-fixed', icon: 'check_circle', iconColor: 'text-tertiary' };
  if (label === 'High concern') return { bg: 'bg-error-container', text: 'text-on-error-container', icon: 'dangerous', iconColor: 'text-error' };
  return { bg: 'bg-secondary-fixed/50', text: 'text-on-secondary-fixed', icon: 'warning', iconColor: 'text-secondary' };
}

function shortAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─────────────────────────────────────────────
// Payment Stage Card
// ─────────────────────────────────────────────
function StageCard({
  step,
  index,
  isDone,
  isActive,
}: {
  step: PaymentStep;
  index: number;
  isDone: boolean;
  isActive: boolean;
}) {
  const meta = STEP_META[step];
  const isLast = step === 'report_generated';

  const cardClass = isLast
    ? isDone
      ? 'p-space-md rounded-2xl bg-surface-container-high flex flex-col gap-space-xs relative clay-pill stage-card-done transition-all duration-500'
      : 'p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-space-xs relative transition-all duration-300'
    : isDone
    ? 'p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-space-xs relative stage-card-done transition-all duration-500'
    : isActive
    ? 'p-space-md rounded-2xl bg-secondary-fixed/20 flex flex-col gap-space-xs relative stage-card-active transition-all duration-300'
    : 'p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-space-xs relative transition-all duration-300 opacity-50';

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <span className="font-mono-data text-[11px] font-bold text-primary tracking-wider uppercase">
          Stage {String(index + 1).padStart(2, '0')}
        </span>
        {isDone ? (
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${isLast ? 'bg-primary text-on-primary shadow-sm' : 'bg-tertiary-fixed text-tertiary'}`}>
            <span className="material-symbols-outlined text-[14px]">{isLast ? 'auto_awesome' : 'done'}</span>
          </span>
        ) : isActive ? (
          <span className="w-6 h-6 rounded-full bg-secondary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-[14px] animate-spin text-secondary">autorenew</span>
          </span>
        ) : (
          <span className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="font-mono-data text-[10px] text-on-surface-variant">{index + 1}</span>
          </span>
        )}
      </div>

      <h3 className={`font-title-md text-title-md leading-tight ${isLast && isDone ? 'text-primary font-bold' : 'text-on-surface'}`}>
        {meta.label}
      </h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{meta.description}</p>

      {step === 'payment_submitted' && isDone ? (
        <a
          className="font-mono-data text-[11px] text-primary hover:text-secondary underline flex items-center gap-1 mt-auto"
          href="https://hashscan.io/testnet"
          rel="noreferrer"
          target="_blank"
        >
          <span>HashScan Explorer</span>
          <span className="material-symbols-outlined text-[12px]">open_in_new</span>
        </a>
      ) : (
        <span className={`font-mono-data text-[11px] mt-auto ${isLast && isDone ? 'text-tertiary font-bold' : 'text-secondary'}`}>
          {meta.extra}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Report Section
// ─────────────────────────────────────────────
function ReportSection({ report, address }: { report: SafetyReport; address: string }) {
  const riskStyle = getRiskStyle(report.riskLabel);

  return (
    <>
      {/* Safety Report Card */}
      <section className="clay-card bg-surface-container-lowest rounded-lg p-space-lg sm:p-space-xl flex flex-col gap-space-lg relative overflow-hidden">
        {/* Accent gradient top band */}
        <div className="h-2 w-full absolute top-0 left-0 bg-gradient-to-r from-primary via-secondary to-tertiary" />

        {/* Report Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border-b pb-space-md border-surface-container">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs flex-wrap">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Report Reference</span>
              <span className="font-mono-data text-body-md font-bold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-full clay-pill">
                {report.reportId}
              </span>
              <span className="font-mono-data text-[12px] text-on-surface-variant">
                Indexed: {new Date(report.evidence.queriedAt).toLocaleString()}
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Automated Safety Screening Assessment</h2>
          </div>
          <div className="flex items-center gap-space-xs flex-wrap">
            <div className="clay-pill bg-surface-container-high px-space-md py-1.5 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-tertiary">verified</span>
              <span className="font-mono-data text-body-sm text-on-surface">Target: {shortAddress(address)}</span>
            </div>
            <div className="clay-pill bg-surface-container-high px-space-md py-1.5 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-secondary">lan</span>
              <span className="font-mono-data text-body-sm text-on-surface">Chain: Arbitrum Sepolia</span>
            </div>
          </div>
        </div>

        {/* Risk Classification + AI Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-stretch">
          {/* Risk Badge */}
          <div className={`lg:col-span-4 rounded-3xl ${riskStyle.bg} p-space-lg flex flex-col justify-between gap-space-md shadow-[inset_2px_2px_5px_rgba(255,255,255,0.9),inset_-2px_-2px_4px_rgba(126,87,0,0.12)]`}>
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps uppercase text-on-secondary-fixed tracking-wider">Classification</span>
              <span className="w-3 h-3 rounded-full bg-secondary animate-ping" />
            </div>
            <div className="flex flex-col gap-1 my-space-xs">
              <div className="clay-pill-amber bg-secondary text-surface px-space-lg py-2.5 rounded-full inline-flex items-center justify-center gap-2 shadow-md">
                <span className={`material-symbols-outlined text-[24px] text-secondary-fixed`}>{riskStyle.icon}</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-on-secondary">{report.riskLabel}</span>
              </div>
              <span className="font-body-sm text-body-sm text-center text-on-secondary-fixed-variant mt-2">
                Confidence: <strong className="text-on-surface">{report.confidence}</strong>
              </span>
            </div>
            {/* 3-Tier Classification */}
            <div className="flex flex-col gap-1.5 pt-space-xs border-t border-secondary/15">
              <span className="font-label-caps text-[10px] uppercase text-on-secondary-fixed tracking-wide">3-Tier Risk Hierarchy:</span>
              <div className="flex items-center justify-between text-[11px] font-mono-data">
                <span className={`font-bold ${report.riskLabel === 'Low signal' ? 'text-tertiary underline decoration-2' : 'text-tertiary'}`}>1. Low signal</span>
                <span className={`font-bold ${report.riskLabel === 'Needs review' ? 'text-secondary underline decoration-2' : 'text-secondary'}`}>2. Needs review</span>
                <span className={`font-bold ${report.riskLabel === 'High concern' ? 'text-error underline decoration-2' : 'text-error'}`}>3. High concern</span>
              </div>
            </div>
          </div>

          {/* AI Synthesis */}
          <div className="lg:col-span-8 rounded-3xl bg-surface-container-low p-space-lg flex flex-col justify-between gap-space-sm shadow-[inset_3px_3px_6px_rgba(166,153,142,0.25),inset_-3px_-3px_6px_rgba(255,255,255,0.9)]">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              <span className="font-label-caps text-label-caps uppercase tracking-wider font-bold">AI Constraint Synthesizer Output</span>
            </div>
            <blockquote className="font-body-lg text-body-lg text-on-surface leading-relaxed italic bg-surface-container-lowest/70 p-space-md rounded-2xl shadow-sm">
              "{report.summary}"
            </blockquote>
            <div className="flex flex-wrap items-center justify-between gap-space-xs pt-1 text-on-surface-variant font-mono-data text-body-sm">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-tertiary">psychology</span>
                Synthesizer: <strong className="text-on-surface ml-1">Deterministic Guard LLM</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">memory</span>
                Guardrail: Strict evidence-bound prompt
              </span>
            </div>
          </div>
        </div>

        {/* Evidence + Reasons Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mt-space-xs">
          {/* Evidence Table */}
          <div className="lg:col-span-6 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="w-8 h-8 rounded-full bg-surface-container-high text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">table_chart</span>
                </span>
                <h3 className="font-title-md text-title-md text-on-surface">The Graph Evidence Telemetry</h3>
              </div>
              <span className="clay-pill bg-tertiary-fixed text-on-tertiary-fixed px-space-xs py-0.5 rounded-full font-mono-data text-[11px] font-bold">
                Data Complete: TRUE
              </span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-space-sm shadow-[inset_3px_3px_6px_rgba(166,153,142,0.3),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] overflow-hidden">
              <table className="w-full text-left font-mono-data text-body-sm">
                <tbody>
                  {[
                    { icon: 'data_object', color: 'text-primary', key: 'dataSource', val: report.evidence.dataSource },
                    { icon: 'analytics', color: 'text-secondary', key: 'eventCount', val: `${report.evidence.eventCount} events` },
                    { icon: 'group', color: 'text-secondary', key: 'uniqueCounterparties', val: `${report.evidence.uniqueCounterparties} addresses` },
                    { icon: 'update', color: 'text-secondary', key: 'recentEventCount (7d)', val: `${report.evidence.recentEventCount} events` },
                    { icon: 'handshake', color: 'text-secondary', key: 'protocolInteractions', val: `${report.evidence.protocolInteractions} pools` },
                    { icon: 'calendar_today', color: 'text-on-surface-variant', key: 'firstSeen', val: report.evidence.firstSeen ? new Date(report.evidence.firstSeen).toLocaleDateString() : '—' },
                    { icon: 'event_available', color: 'text-on-surface-variant', key: 'lastSeen', val: report.evidence.lastSeen ? new Date(report.evidence.lastSeen).toLocaleDateString() : '—' },
                  ].map(({ icon, color, key, val }, i, arr) => (
                    <tr key={key} className={i < arr.length - 1 ? 'border-b border-surface-container-high' : ''}>
                      <td className="py-2.5 px-3 text-on-surface-variant">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[16px] ${color}`}>{icon}</span>
                          <span>{key}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-right text-on-surface">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Reasons + Checks + Limitations */}
          <div className="lg:col-span-6 flex flex-col gap-space-md">
            {/* Reasons */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="w-7 h-7 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">find_in_page</span>
                </span>
                <h4 className="font-title-md text-title-md text-on-surface">Identified Observations ({report.reasons.length})</h4>
              </div>
              <ul className="flex flex-col gap-2">
                {report.reasons.map((r, i) => (
                  <li key={i} className="p-space-sm rounded-xl bg-surface-container-low flex items-start gap-2 shadow-xs">
                    <span className="material-symbols-outlined text-[18px] text-secondary flex-shrink-0 mt-0.5">info</span>
                    <span className="font-body-md text-body-md text-on-surface">{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Checks */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="w-7 h-7 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">checklist</span>
                </span>
                <h4 className="font-title-md text-title-md text-on-surface">Recommended User Verification ({report.recommendedChecks.length})</h4>
              </div>
              <ul className="flex flex-col gap-2">
                {report.recommendedChecks.map((c, i) => (
                  <li key={i} className="p-space-sm rounded-xl bg-surface-container-low flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-tertiary flex-shrink-0 mt-0.5">check</span>
                    <span className="font-body-md text-body-md text-on-surface">{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Limitations */}
            <div className="p-space-md rounded-2xl bg-surface-container-high/70 flex flex-col gap-1.5 shadow-[inset_2px_2px_4px_rgba(166,153,142,0.2)]">
              <span className="font-label-caps text-label-caps uppercase text-primary font-bold">Strict Protocol Limitations</span>
              <div className="flex flex-col gap-1 font-body-sm text-body-sm text-on-surface-variant">
                {report.limitations.map((l, i) => (
                  <p key={i}>• {l}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Receipt Card */}
      <section className="clay-card bg-surface-container-lowest rounded-lg p-space-lg sm:p-space-xl flex flex-col gap-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">On-Chain Micropayment Receipt (Hedera)</h3>
          </div>
          <a
            className="clay-pill bg-surface-container-low hover:bg-surface-container text-primary font-mono-data text-body-sm px-space-md py-1.5 rounded-full flex items-center gap-2 transition-transform active:translate-y-0.5"
            href="https://hashscan.io/testnet"
            rel="noreferrer"
            target="_blank"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">link</span>
            <span>View on HashScan</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {[
            { label: 'Payer Account', value: '0.0.8231465', sub: 'ChainGuard Client Agent', color: 'text-on-surface' },
            { label: 'Receiver / Sentinel Vault', value: '0.0.8341807', sub: 'Facilitator Treasury Node', color: 'text-primary' },
            { label: 'Settlement Amount', value: `${report.payment.amount} HBAR`, sub: '≈ 100,000 tinybars testnet', color: 'text-secondary' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-1 shadow-[inset_2px_2px_4px_rgba(166,153,142,0.25)]">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{label}</span>
              <span className={`font-mono-data text-title-md font-bold ${color}`}>{value}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{sub}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="rounded-2xl bg-secondary-fixed/30 p-space-md flex items-start gap-space-sm">
          <span className="material-symbols-outlined text-[24px] text-secondary flex-shrink-0 mt-0.5">policy</span>
          <p className="font-body-md text-body-md text-on-surface leading-relaxed">
            <strong className="font-semibold text-primary">Mandatory Screening Notice:</strong> This report is an educational screening result based on indexed testnet data. It is not financial advice and does not guarantee that an address or transaction is safe. Always conduct comprehensive manual source code reviews and simulate transactions before committing capital.
          </p>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────
export default function App() {
  const [address, setAddress] = useState('0x1f98431c8aD98523631AE4a59f267346ea31F984');
  const [subjectType, setSubjectType] = useState<'wallet' | 'protocol'>('protocol');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AgentReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<PaymentStep[]>([]);
  const [demoIdx, setDemoIdx] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || isLoading) return;

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

  const cycleDemoAddress = () => {
    const next = (demoIdx + 1) % DEMO_ADDRESSES.length;
    setDemoIdx(next);
    setAddress(DEMO_ADDRESSES[next]);
  };

  const progressWidth = isLoading
    ? `${(completedSteps.length / ALL_PAYMENT_STEPS.length) * 100}%`
    : result?.status === 'success'
    ? '100%'
    : '0%';

  return (
    <>
      {/* ── Fixed Header ── */}
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(166,153,142,0.18)]">
        <div className="h-20 max-w-[1200px] mx-auto px-space-lg flex items-center justify-between gap-space-md">
          {/* Logo + Nav */}
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-on-primary shadow-md">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </span>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary leading-tight tracking-tight">
                  ChainGuard <span className="font-body-sm text-body-sm text-secondary font-semibold">Lite</span>
                </span>
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">AI Contract Sentinel</span>
              </div>
            </div>
            <div className="clay-pill bg-error-container text-on-error-container px-space-sm py-space-xxs rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-error animate-ping" />
              <span className="font-label-caps text-label-caps">TESTNET ONLY</span>
            </div>
          </div>

          {/* Status Pills + Links */}
          <div className="flex items-center gap-space-sm">
            <div className="clay-pill bg-surface-container-low px-space-sm py-space-xxs rounded-full hidden md:flex items-center gap-space-xxs">
              <span className="material-symbols-outlined text-[16px] text-tertiary">schema</span>
              <span className="font-mono-data text-mono-data text-on-surface">The Graph Indexed</span>
            </div>
            <div className="clay-pill-amber bg-secondary-fixed px-space-sm py-space-xxs rounded-full hidden lg:flex items-center gap-space-xxs">
              <span className="material-symbols-outlined text-[16px] text-on-secondary-container">bolt</span>
              <span className="font-mono-data text-mono-data text-on-secondary-container font-semibold">x402: 0.001 HBAR</span>
            </div>
            <div className="clay-pill bg-surface-container px-space-sm py-space-xxs rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary-container" />
              <span className="font-mono-data text-mono-data text-on-surface font-medium hidden sm:inline">Hedera Testnet (296)</span>
              <span className="font-mono-data text-mono-data text-on-surface font-medium sm:hidden">296</span>
            </div>
            <a
              className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors clay-pill"
              href="https://github.com/Sanjaylicet/ChainGuard-"
              rel="noreferrer"
              target="_blank"
              title="GitHub Repository"
            >
              <span className="material-symbols-outlined text-[18px]">code</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="w-full pt-20 bg-surface">
        <div className="flex flex-col w-full max-w-[1200px] mx-auto px-space-md sm:px-space-lg pb-space-3xl gap-space-2xl">

          {/* ── Hero Section ── */}
          <section className="flex flex-col items-center text-center pt-space-md gap-space-md relative">
            <div className="absolute -top-10 w-96 h-48 bg-secondary-fixed/40 blur-3xl rounded-full pointer-events-none -z-10" />

            {/* Hero Badges */}
            <div className="flex flex-wrap items-center justify-center gap-space-xs sm:gap-space-sm">
              <div className="clay-pill bg-error-container text-on-error-container px-space-md py-1 rounded-full flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
                <span className="font-label-caps text-label-caps uppercase tracking-wider">TESTNET ONLY (DEMO)</span>
              </div>
              <div className="clay-pill-amber bg-secondary-fixed text-on-secondary-fixed px-space-md py-1 rounded-full flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">flash_on</span>
                <span className="font-mono-data text-mono-data font-semibold">Hedera Testnet: 0.001 HBAR</span>
              </div>
              <div className="clay-pill bg-surface-container-low text-on-surface-variant px-space-md py-1 rounded-full flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">hub</span>
                <span className="font-body-sm text-body-sm font-medium">Uniswap V3 Arbitrum Sepolia Subgraph</span>
              </div>
            </div>

            {/* Shield + Title */}
            <div className="flex flex-col items-center gap-space-xs mt-space-xs">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl clay-card bg-surface-container-lowest p-space-xs flex items-center justify-center transform transition-transform hover:scale-105 active:scale-95 duration-200">
                  <span className="material-symbols-outlined text-[64px] text-primary">shield</span>
                </div>
                <span className="absolute -bottom-2 -right-2 bg-primary text-on-primary font-mono-data text-[10px] px-2 py-0.5 rounded-full clay-pill shadow-sm">v1.0.4</span>
              </div>
              <div className="flex flex-col items-center mt-space-xs">
                <h1 className="font-display-xl-mobile sm:font-display-xl text-display-xl-mobile sm:text-display-xl text-primary tracking-tight font-bold">
                  ChainGuard <span className="text-secondary">Lite</span>
                </h1>
                <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant text-center mt-space-xxs">
                  Testnet-Only AI-Assisted Crypto Safety Screening powered by{' '}
                  <strong className="text-on-surface">The Graph</strong> &amp;{' '}
                  <strong className="text-on-surface">Hedera x402 Micropayments</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* ── Screening Input Card ── */}
          <section className="clay-card bg-surface-container-lowest rounded-lg p-space-lg sm:p-space-xl flex flex-col gap-space-lg transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Target EVM Contract / Address</h2>
              </div>

              {/* Subject Type Toggle */}
              <div
                className="inline-flex p-1 rounded-full bg-surface-container-high shadow-[inset_3px_3px_6px_rgba(166,153,142,0.35),inset_-3px_-3px_6px_rgba(255,255,255,0.9)]"
                id="subjectToggleGroup"
              >
                <button
                  type="button"
                  id="toggleWallet"
                  onClick={() => setSubjectType('wallet')}
                  className={`px-space-md py-1 rounded-full font-title-md text-title-md transition-all ${
                    subjectType === 'wallet'
                      ? 'clay-pill bg-surface-container-lowest text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Wallet
                </button>
                <button
                  type="button"
                  id="toggleProtocol"
                  onClick={() => setSubjectType('protocol')}
                  className={`px-space-md py-1 rounded-full font-title-md text-title-md transition-all ${
                    subjectType === 'protocol'
                      ? 'clay-pill bg-surface-container-lowest text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Protocol
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
              <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
                {/* Address Input */}
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                    <span className="material-symbols-outlined text-[20px]">token</span>
                  </span>
                  <input
                    id="contractAddressInput"
                    className="w-full pl-12 pr-4 py-3.5 rounded-full bg-surface-container-low font-mono-data text-mono-data text-on-surface focus:outline-none shadow-[inset_4px_4px_8px_rgba(166,153,142,0.32),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] focus:shadow-[inset_2px_2px_4px_rgba(229,169,60,0.4),0_0_0_2px_rgba(229,169,60,0.3)] transition-all"
                    placeholder="Enter EVM Address (0x...)"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>

                <div className="flex items-center gap-space-xs flex-shrink-0">
                  {/* Demo Address Button */}
                  <button
                    type="button"
                    onClick={cycleDemoAddress}
                    title="Load sample Uniswap V3 pool address"
                    className="clay-pill bg-surface-container px-space-md py-3.5 rounded-full font-title-md text-title-md text-on-surface hover:bg-surface-container-high transition-transform active:translate-y-0.5 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">casino</span>
                    <span>Demo Address</span>
                  </button>

                  {/* Generate Report CTA */}
                  <button
                    type="submit"
                    id="runAuditBtn"
                    disabled={isLoading || !address.trim()}
                    className="clay-pill bg-primary hover:bg-primary-container text-on-primary px-space-lg py-3.5 rounded-full font-title-md text-title-md flex items-center justify-center gap-2 shadow-[6px_6px_14px_rgba(124,26,45,0.35),-4px_-4px_10px_rgba(255,255,255,0.85)] active:translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin text-secondary-fixed">autorenew</span>
                        <span className="font-semibold tracking-wide">Querying Subgraph &amp; Hedera…</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px] text-secondary-fixed">bolt</span>
                        <span className="font-semibold tracking-wide">Generate Safety Report</span>
                        <span className="font-mono-data text-body-sm opacity-90 font-normal ml-0.5">(0.001 HBAR)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Hint Ribbon */}
              <div className="flex flex-wrap items-center justify-between text-body-sm text-on-surface-variant px-space-xs gap-space-xs">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                  <span>Queries Uniswap V3 Arbitrum Sepolia Subgraph instantly</span>
                </div>
                <div className="flex items-center gap-2 font-mono-data text-[12px]">
                  <span>Facilitator: <span className="text-primary font-semibold">@x402/hedera</span></span>
                  <span>•</span>
                  <span>Payload: <span className="text-secondary font-semibold">JSON-RPC /v1/safety-report</span></span>
                </div>
              </div>
            </form>
          </section>

          {/* ── x402 Payment Lifecycle ── */}
          <section className="clay-card bg-surface-container-lowest rounded-lg p-space-lg sm:p-space-xl flex flex-col gap-space-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <div className="w-9 h-9 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">currency_exchange</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">x402 Micropayment &amp; Verification Lifecycle</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Real-time settlement protocol trace for sub-cent contract safety verification</p>
                </div>
              </div>
              <div className="clay-pill bg-tertiary-fixed text-on-tertiary-fixed px-space-sm py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                <span className="font-mono-data text-body-sm font-semibold">
                  {result?.status === 'success' ? 'Settled (100,000 tinybars)' : isLoading ? 'Processing…' : 'Awaiting Request'}
                </span>
              </div>
            </div>

            {/* Stage Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-sm relative">
              {ALL_PAYMENT_STEPS.map((step, i) => {
                const isDone = completedSteps.includes(step);
                const isActive = !isDone && isLoading && completedSteps.length === i;
                return (
                  <StageCard
                    key={step}
                    step={step}
                    index={i}
                    isDone={isDone}
                    isActive={isActive}
                  />
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden shadow-[inset_1px_1px_3px_rgba(166,153,142,0.4)]">
              <div
                className="bg-gradient-to-r from-secondary to-primary h-full rounded-full transition-all duration-500"
                style={{ width: progressWidth }}
              />
            </div>
          </section>

          {/* ── Error Banner ── */}
          {error && (
            <div className="clay-card bg-error-container rounded-lg p-space-lg flex items-start gap-space-md">
              <span className="material-symbols-outlined text-[28px] text-error flex-shrink-0">error</span>
              <div>
                <div className="font-headline-sm text-headline-sm text-on-error-container font-bold">Request Failed</div>
                <p className="font-body-md text-body-md text-on-error-container mt-1">{error}</p>
                <p className="font-mono-data text-[12px] text-on-error-container/70 mt-2">
                  Make sure <code className="text-error font-bold">npm run dev:agent</code> and <code className="text-error font-bold">npm run dev:report-service</code> are running.
                </p>
              </div>
            </div>
          )}

          {/* ── Report ── */}
          {result?.status === 'success' && result.report && (
            <ReportSection report={result.report} address={address} />
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full bg-surface-container-low mt-space-3xl py-space-2xl">
        <div className="max-w-[1200px] mx-auto px-space-lg flex flex-col gap-space-lg">
          <div className="clay-card bg-surface-container-lowest p-space-lg rounded-xl flex items-start sm:items-center gap-space-md">
            <div className="p-space-xs rounded-full bg-secondary-fixed text-on-secondary-fixed flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div className="flex-1">
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <strong className="text-on-surface font-semibold">Educational Screening Notice:</strong> This report is an educational screening result based on indexed testnet data. It is not financial advice and does not guarantee that an address or transaction is safe.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-space-md pt-space-xs">
            <div className="flex items-center gap-space-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">© 2026 ChainGuard Lite</span>
              <span className="text-outline-variant">•</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Crafted for <span className="font-semibold text-primary">ETHOnline 2026</span></span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-space-md">
              <div className="flex items-center gap-1.5 text-on-surface-variant font-mono-data text-mono-data">
                <span className="w-2 h-2 rounded-full bg-tertiary-container" />
                <span>Subgraphs by The Graph</span>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface-variant font-mono-data text-mono-data">
                <span className="w-2 h-2 rounded-full bg-secondary-container" />
                <span>Hedera x402 Micropayments</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
