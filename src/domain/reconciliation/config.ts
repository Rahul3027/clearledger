import { ReconciliationConfig } from "./types";

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  absoluteAmountTolerance: 0.05,
  percentageAmountTolerance: 0.0001, // 0.01%
  dateToleranceDays: 1, // 1 day before/after
  
  penaltyAmountFactor: 5.0, // Max 5 points penalty for max amount deviation
  penaltyDateFactor: 5.0,   // Max 5 points penalty for max date deviation
  
  minimumConfidenceThreshold: 80.0, // Any candidate below this score is discarded
};
