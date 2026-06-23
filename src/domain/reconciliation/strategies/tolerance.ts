import { CanonicalTransactionInput } from "../../ingestion/types";
import { MatchCandidate, MatchStrategyType, ReconciliationConfig } from "../types";
import { BaseStrategy } from "./base";

export class ToleranceStrategy extends BaseStrategy {
  name: MatchStrategyType = "TOLERANCE";
  baseConfidence = 90.0;

  findCandidates(sourceTx: CanonicalTransactionInput, targetPool: CanonicalTransactionInput[], config: ReconciliationConfig): MatchCandidate[] {
    const candidates: MatchCandidate[] = [];

    // Requires core identifiers
    if (!sourceTx.docNumber || !sourceTx.currencyCode || !sourceTx.counterpartyTaxId) {
      return candidates;
    }

    for (const target of targetPool) {
      // Hard exact matches on strings
      if (
        sourceTx.docNumber !== target.docNumber ||
        sourceTx.currencyCode !== target.currencyCode ||
        sourceTx.counterpartyTaxId !== target.counterpartyTaxId
      ) {
        continue;
      }

      // Variance checks
      const amountVariance = Math.abs(sourceTx.netAmount - target.netAmount);
      const maxAllowedVariance = Math.max(
        config.absoluteAmountTolerance,
        Math.abs(target.netAmount * config.percentageAmountTolerance)
      );

      // Must fall within amount tolerance
      if (amountVariance > maxAllowedVariance) {
        continue;
      }

      const dateVarianceDays = this.getDaysDifference(sourceTx.docDate, target.docDate);
      
      // Must fall within date tolerance
      if (dateVarianceDays > config.dateToleranceDays) {
        continue;
      }

      // Exact match logic already caught 0 variance scenarios in theory, 
      // but this acts as a fallback / superset.
      candidates.push(
        this.scoreCandidate(
          target,
          this.baseConfidence,
          amountVariance,
          dateVarianceDays,
          config,
          "Candidate selected via Tolerance Match. Identifiers matched, checking variances."
        )
      );
    }

    return candidates;
  }
}
