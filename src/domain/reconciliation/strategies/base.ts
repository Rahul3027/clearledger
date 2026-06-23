import { CanonicalTransactionInput } from "../../ingestion/types";
import { MatchCandidate, MatchingStrategy, MatchStrategyType, ReconciliationConfig } from "../types";

export abstract class BaseStrategy implements MatchingStrategy {
  abstract name: MatchStrategyType;
  abstract baseConfidence: number;

  abstract findCandidates(sourceTx: CanonicalTransactionInput, targetPool: CanonicalTransactionInput[], config: ReconciliationConfig): MatchCandidate[];

  /**
   * Calculates the formal confidence score based on the base confidence minus variance penalties.
   */
  protected scoreCandidate(
    targetTx: CanonicalTransactionInput,
    baseConfidence: number,
    amountVariance: number,
    dateVarianceDays: number,
    config: ReconciliationConfig,
    baseEvidence: string
  ): MatchCandidate {
    
    let penaltyAmount = 0;
    let penaltyDate = 0;
    const evidence = [baseEvidence];

    // Amount Penalty Calculation
    const maxAmountTolerance = Math.max(
      config.absoluteAmountTolerance,
      Math.abs(targetTx.netAmount * config.percentageAmountTolerance)
    );

    if (amountVariance > 0) {
      if (amountVariance > maxAmountTolerance) {
        // Technically this shouldn't be selected as a candidate by tolerance strategy,
        // but if it is, we penalize it heavily or return score < threshold.
        penaltyAmount = config.penaltyAmountFactor * 2; 
      } else {
        penaltyAmount = (amountVariance / maxAmountTolerance) * config.penaltyAmountFactor;
      }
      evidence.push(`Amount variance of ${amountVariance.toFixed(2)} resulted in a -${penaltyAmount.toFixed(2)} penalty.`);
    }

    // Date Penalty Calculation
    if (dateVarianceDays > 0) {
      if (dateVarianceDays > config.dateToleranceDays) {
        penaltyDate = config.penaltyDateFactor * 2;
      } else {
        penaltyDate = (dateVarianceDays / config.dateToleranceDays) * config.penaltyDateFactor;
      }
      evidence.push(`Date variance of ${dateVarianceDays} days resulted in a -${penaltyDate.toFixed(2)} penalty.`);
    }

    let finalConfidence = baseConfidence - penaltyAmount - penaltyDate;
    if (finalConfidence > 100) finalConfidence = 100;
    
    return {
      targetTx,
      strategyUsed: this.name,
      baseConfidence,
      finalConfidence,
      amountVariance,
      evidence
    };
  }

  protected getDaysDifference(date1: Date, date2: Date): number {
    const msDiff = Math.abs(date1.getTime() - date2.getTime());
    return Math.floor(msDiff / (1000 * 60 * 60 * 24));
  }
}
