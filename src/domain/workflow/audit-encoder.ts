import { AuditEventType } from "./types";

export class AuditEncoder {
  
  /**
   * Generates a standard audit outbox payload for Workflow events.
   */
  public static encodeEvent(
    orgId: string,
    actorId: string,
    eventType: AuditEventType,
    caseId: string,
    beforeState?: Record<string, unknown>,
    afterState?: Record<string, unknown>
  ) {
    return {
      orgId,
      actorId,
      actorType: "USER" as "USER" | "SYSTEM", // Assuming workflow mutations are always user-driven
      eventType,
      resourceType: "EXCEPTION_CASE",
      resourceId: caseId,
      beforeState: beforeState ? beforeState : undefined,
      afterState: afterState ? afterState : undefined
    };
  }
}
