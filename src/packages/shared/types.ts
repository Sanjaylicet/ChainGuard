// ============================================================
// ChainGuard Lite — Shared Types
// ============================================================

export type NormalizedEvidence = {
  address: string;
  eventCount: number;
  uniqueCounterparties: number;
  recentEventCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  protocolInteractions: number;
  dataComplete: boolean;
  source: "The Graph";
  queriedAt: string;
};

export type RiskLabel = "Low signal" | "Needs review" | "High concern";

export type RiskScore = {
  label: RiskLabel;
  score: number;
  confidence: "high" | "limited" | "none";
  reasons: string[];
};

export type AIReport = {
  summary: string;
  reasons: string[];
  recommendedChecks: string[];
  limitations: string[];
};

export type SafetyReport = {
  reportId: string;
  subject: {
    address: string;
    network: "testnet";
    type: "wallet" | "protocol";
  };
  riskLabel: RiskLabel;
  confidence: "high" | "limited" | "none";
  summary: string;
  reasons: string[];
  evidence: {
    eventCount: number;
    uniqueCounterparties: number;
    recentEventCount: number;
    firstSeen: string | null;
    lastSeen: string | null;
    protocolInteractions: number;
    dataSource: "The Graph";
    queriedAt: string;
  };
  recommendedChecks: string[];
  limitations: string[];
  payment: {
    network: "hedera:testnet";
    asset: "HBAR";
    amount: string;
    status: "verified" | "pending" | "failed";
  };
};

export type AgentReportRequest = {
  address: string;
  subjectType: "wallet" | "protocol";
};

export type PaymentStep =
  | "payment_required"
  | "payment_signed"
  | "payment_submitted"
  | "payment_verified"
  | "report_generated";

export type AgentReportResponse = {
  status: "success" | "error";
  paymentSteps: PaymentStep[];
  report?: SafetyReport;
  error?: string;
};
