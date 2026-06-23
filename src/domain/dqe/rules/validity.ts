import { CanonicalTransactionInput } from "../../ingestion/types";
import { DqRuleInterface, DqRuleResult } from "../types";

export class ValidityRule implements DqRuleInterface {
  name = "validity";

  evaluate(transaction: CanonicalTransactionInput, params?: Record<string, any>): DqRuleResult {
    // Basic currency validation: ISO 4217 is exactly 3 uppercase letters
    if (!/^[A-Z]{3}$/.test(transaction.currencyCode)) {
      return { ruleName: this.name, passFactor: 0.0, failureReason: `Invalid Currency Code: ${transaction.currencyCode}` };
    }

    // Basic amount validation: cannot be NaN
    if (isNaN(transaction.grossAmount) || isNaN(transaction.netAmount)) {
      return { ruleName: this.name, passFactor: 0.0, failureReason: "Numeric amounts are NaN" };
    }

    return { ruleName: this.name, passFactor: 1.0 };
  }
}
