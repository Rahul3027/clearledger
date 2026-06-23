import { CaseStatus, ALLOWED_TRANSITIONS } from "./types";

export class WorkflowStateMachine {
  
  /**
   * Validates if a transition from currentState to nextState is legally allowed.
   * Throws an error if forbidden.
   */
  public static validateTransition(currentState: CaseStatus, nextState: CaseStatus): void {
    if (currentState === nextState) {
      throw new Error(`Invalid transition: Case is already in state ${currentState}`);
    }

    const allowed = ALLOWED_TRANSITIONS[currentState];
    
    if (!allowed || !allowed.includes(nextState)) {
      throw new Error(
        `Forbidden transition: Cannot move from ${currentState} to ${nextState}. ` +
        `Allowed transitions from ${currentState} are: ${allowed ? allowed.join(", ") : "None"}`
      );
    }
  }

  /**
   * Determines if a state requires mandatory "Resolution Notes" to proceed.
   */
  public static requiresResolutionNotes(nextState: CaseStatus): boolean {
    return nextState === "RESOLVED" || nextState === "CLOSED";
  }
}
