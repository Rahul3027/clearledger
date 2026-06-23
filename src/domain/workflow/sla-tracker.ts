import { CaseStatus, ExceptionCase } from "./types";

export class SLATracker {
  
  /**
   * Applies timestamp updates to a case based on assignment action.
   */
  public static handleAssignment(currentCase: ExceptionCase, newAssigneeId: string): Partial<ExceptionCase> {
    const updates: Partial<ExceptionCase> = { assignedTo: newAssigneeId };
    
    // Only stamp assignedAt if it's the absolute first time it gets an owner
    if (!currentCase.assignedAt && newAssigneeId !== null) {
      updates.assignedAt = new Date();
    }
    
    return updates;
  }

  /**
   * Applies timestamp updates to a case based on status transition.
   */
  public static handleTransition(currentCase: ExceptionCase, nextState: CaseStatus): Partial<ExceptionCase> {
    const updates: Partial<ExceptionCase> = { status: nextState };
    
    const now = new Date();

    // Stamp first response if moving out of OPEN for the first time
    if (!currentCase.firstResponseAt && currentCase.status === "OPEN" && nextState !== "OPEN") {
      updates.firstResponseAt = now;
    }

    // Stamp resolution time
    if (nextState === "RESOLVED") {
      updates.resolvedAt = now;
    }

    // Clear resolution time if it gets reopened or kicked back to review
    if (currentCase.status === "RESOLVED" && nextState !== "CLOSED") {
      updates.resolvedAt = null;
    }

    return updates;
  }

  /**
   * Generates a target SLA breach date based on priority.
   * Simple V1 implementation: Critical = 4h, High = 24h, Medium = 72h, Low = 168h (7 days).
   */
  public static calculateSlaTarget(priority: ExceptionCase["priority"], startDate: Date = new Date()): Date {
    const target = new Date(startDate.getTime());
    switch (priority) {
      case "CRITICAL": target.setHours(target.getHours() + 4); break;
      case "HIGH": target.setHours(target.getHours() + 24); break;
      case "MEDIUM": target.setHours(target.getHours() + 72); break;
      case "LOW": target.setHours(target.getHours() + 168); break;
    }
    return target;
  }
}
