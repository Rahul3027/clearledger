import { CanonicalTransactionInput } from "../../ingestion/types";
import { DqRuleInterface, DqRuleResult } from "../types";

export class ConsistencyRule implements DqRuleInterface {
  name = "consistency";

  evaluate(transaction: CanonicalTransactionInput, params?: Record<string, any>): DqRuleResult {
    // Basic consistency check: Gross = Net + Tax (with slight tolerance for rounding)
    const tolerance = params?.tolerance || 0.05;

    const net = Number(transaction.netAmount) || 0;
    const tax = Number(transaction.taxAmount) || 0;
    const gross = Number(transaction.grossAmount) || 0;

    // Only apply if all three exist, or if tax is strictly 0 and gross=net
    if (transaction.grossAmount !== undefined && transaction.netAmount !== undefined) {
      const expectedGross = net + tax;
      const diff = Math.abs(gross - expectedGross);
      
      if (diff > tolerance) {
        return {
          ruleName: this.name,
          passFactor: 0.0,
          failureReason: `Consistency failure: Gross (${gross}) != Net (${net}) + Tax (${tax})`
        };
      }
    }

    return { ruleName: this.name, passFactor: 1.0 };
  }
}
