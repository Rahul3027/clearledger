import { CanonicalTransactionInput } from "../ingestion/types";

export type MatchStatus = "MATCHED" | "MATCHED_WITH_TOLERANCE" | "AMBIGUOUS" | "UNMATCHED" | "MANUAL_MATCH";
export type MatchStrategyType = "EXACT" | "TOLERANCE" | "COMPOSITE" | "MANUAL";

export interface ReconciliationResult {
  sourceTx: CanonicalTransactionInput;
  targetTx?: CanonicalTransactionInput;
  status: MatchStatus;
  strategyUsed?: MatchStrategyType;
  confidenceScore: number;
  amountVariance: number;
  evidenceTrail: string[];
}

export interface MatchCandidate {
  targetTx: CanonicalTransactionInput;
  strategyUsed: MatchStrategyType;
  baseConfidence: number;
  finalConfidence: number;
  amountVariance: number;
  evidence: string[];
}

export interface MatchingStrategy {
  name: MatchStrategyType;
  baseConfidence: number;
  findCandidates(sourceTx: CanonicalTransactionInput, targetPool: CanonicalTransactionInput[], config: ReconciliationConfig): MatchCandidate[];
}

export interface ReconciliationConfig {
  absoluteAmountTolerance: number; // e.g., 0.05
  percentageAmountTolerance: number; // e.g., 0.0001 (0.01%)
  dateToleranceDays: number; // e.g., 1
  
  // Penalty multipliers
  penaltyAmountFactor: number; // e.g., max 5 points for max tolerance
  penaltyDateFactor: number; // e.g., max 5 points for max date tolerance
  
  minimumConfidenceThreshold: number; // e.g., 80
}
