import { CanonicalTransactionInput } from "../../ingestion/types";
import { MatchCandidate, MatchStrategyType, ReconciliationConfig } from "../types";
import { BaseStrategy } from "./base";

export class CompositeStrategy extends BaseStrategy {
  name: MatchStrategyType = "COMPOSITE";
  baseConfidence = 80.0;

  findCandidates(sourceTx: CanonicalTransactionInput, targetPool: CanonicalTransactionInput[], config: ReconciliationConfig): MatchCandidate[] {
    const candidates: MatchCandidate[] = [];

    // Requires core financials
    if (
      !sourceTx.docDate || 
      !sourceTx.currencyCode || 
      !sourceTx.counterpartyTaxId || 
      sourceTx.grossAmount === undefined || 
      sourceTx.netAmount === undefined
    ) {
      return candidates;
    }

    for (const target of targetPool) {
      // Hard exact matches on core financials, ignoring docNumber entirely
      if (
        sourceTx.currencyCode === target.currencyCode &&
        sourceTx.counterpartyTaxId === target.counterpartyTaxId &&
        sourceTx.grossAmount === target.grossAmount &&
        sourceTx.netAmount === target.netAmount &&
        sourceTx.docDate.getTime() === target.docDate.getTime()
      ) {
        // Technically variance is 0 since amounts and dates match exactly
        candidates.push(
          this.scoreCandidate(
            target,
            this.baseConfidence,
            0,
            0,
            config,
            "Candidate selected via Composite Match. docNumber absent or mismatched, but exact combinations of docDate, grossAmount, netAmount, and counterpartyTaxId aligned."
          )
        );
      }
    }

    return candidates;
  }
}
