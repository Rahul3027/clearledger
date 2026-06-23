export type CaseStatus = "OPEN" | "IN_REVIEW" | "WAITING_FOR_INFO" | "RESOLVED" | "CLOSED" | "REOPENED";
export type CasePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ExceptionCase {
  id: string;
  orgId: string;
  sourcePlatformId: string;
  reconciliationResultId?: string | null;
  status: CaseStatus;
  priority: CasePriority;
  assignedTo?: string | null;
  createdAt: Date;
  assignedAt?: Date | null;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  slaTargetAt?: Date | null;
}

export type AuditEventType = 
  | "CASE_CREATED"
  | "CASE_ASSIGNED"
  | "CASE_REASSIGNED"
  | "CASE_STATUS_CHANGED"
  | "CASE_COMMENT_ADDED"
  | "CASE_ATTACHMENT_ADDED"
  | "CASE_RESOLVED"
  | "CASE_CLOSED"
  | "CASE_REOPENED";

// A map defining the strictly allowed transitions out of each state
export const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  OPEN: ["IN_REVIEW", "CLOSED"],
  IN_REVIEW: ["WAITING_FOR_INFO", "RESOLVED"],
  WAITING_FOR_INFO: ["IN_REVIEW", "RESOLVED"],
  RESOLVED: ["CLOSED", "IN_REVIEW"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_REVIEW"],
};
