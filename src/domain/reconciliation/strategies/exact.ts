import { CanonicalTransactionInput } from "../../ingestion/types";
import { MatchCandidate, MatchStrategyType, ReconciliationConfig } from "../types";
import { BaseStrategy } from "./base";

export class ExactStrategy extends BaseStrategy {
  name: MatchStrategyType = "EXACT";
  baseConfidence = 100.0;

  findCandidates(sourceTx: CanonicalTransactionInput, targetPool: CanonicalTransactionInput[], config: ReconciliationConfig): MatchCandidate[] {
    const candidates: MatchCandidate[] = [];

    // Exact match requires all of these to be populated and match exactly
    if (!sourceTx.docNumber || !sourceTx.docDate || !sourceTx.currencyCode || !sourceTx.counterpartyTaxId) {
      return candidates;
    }

    for (const target of targetPool) {
      if (
        sourceTx.docNumber === target.docNumber &&
        sourceTx.currencyCode === target.currencyCode &&
        sourceTx.counterpartyTaxId === target.counterpartyTaxId &&
        sourceTx.netAmount === target.netAmount &&
        sourceTx.taxAmount === target.taxAmount &&
        sourceTx.docDate.getTime() === target.docDate.getTime()
      ) {
        
        candidates.push(
          this.scoreCandidate(
            target,
            this.baseConfidence,
            0, // amount variance
            0, // date variance
            config,
            "Candidate selected via Exact Match. Identical keys: docNumber, docDate, currencyCode, netAmount, taxAmount, counterpartyTaxId."
          )
        );
      }
    }

    return candidates;
  }
}
