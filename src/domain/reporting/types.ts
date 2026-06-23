export type EvidencePackageStatus = "PENDING" | "GENERATING" | "READY" | "FAILED" | "EXPIRED";

export interface EvidencePackage {
  id: string;
  orgId: string;
  periodKey: string;
  status: EvidencePackageStatus;
  storagePath?: string | null;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date | null;
}

export interface DashboardMetrics {
  totalIngestedVolume: number;
  dqeRejectRate: number; // 0-100
  matchRate: number; // 0-100
  autoMatchRatio: number; // 0-100
  manualOverrideCount: number;
  evidencePackageCount: number;
  slaBreachRate: number; // 0-100
  averageResolutionHours: number;
}

export type ReportingAuditEventType = 
  | "REPORT_GENERATED"
  | "EVIDENCE_PACKAGE_REQUESTED"
  | "EVIDENCE_PACKAGE_DOWNLOADED";
