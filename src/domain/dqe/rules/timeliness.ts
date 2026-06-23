import { CanonicalTransactionInput } from "../../ingestion/types";
import { DqRuleInterface, DqRuleResult } from "../types";

export class TimelinessRule implements DqRuleInterface {
  name = "timeliness";

  evaluate(transaction: CanonicalTransactionInput, params?: Record<string, any>): DqRuleResult {
    if (!transaction.docDate || !transaction.periodKey) {
      return { ruleName: this.name, passFactor: 0.0, failureReason: "Missing docDate or periodKey" };
    }

    const month = (transaction.docDate.getMonth() + 1).toString().padStart(2, '0');
    const derivedPeriod = `${transaction.docDate.getFullYear()}-${month}`;

    if (derivedPeriod !== transaction.periodKey) {
      return { 
        ruleName: this.name, 
        passFactor: 0.0, 
        failureReason: `Doc date (${transaction.docDate.toISOString().split('T')[0]}) does not match period key (${transaction.periodKey})` 
      };
    }

    return { ruleName: this.name, passFactor: 1.0 };
  }
}
