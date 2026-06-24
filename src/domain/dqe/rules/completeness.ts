/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { CanonicalTransactionInput } from "../../ingestion/types";
import { DqRuleInterface, DqRuleResult } from "../types";

export class CompletenessRule implements DqRuleInterface {
  name = "completeness";

  evaluate(transaction: CanonicalTransactionInput, params?: Record<string, any>): DqRuleResult {
    const requiredFields = params?.requiredFields || ["docNumber", "docDate", "netAmount", "grossAmount"];
    
    let missingCount = 0;
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const val = (transaction as any)[field];
      if (val === undefined || val === null || val === "") {
        missingCount++;
        missingFields.push(field);
      }
    }

    if (missingCount === 0) {
      return { ruleName: this.name, passFactor: 1.0 };
    }

    // Partial failure vs complete failure based on how many are missing
    const passFactor = missingCount === requiredFields.length ? 0.0 : 0.5;

    return {
      ruleName: this.name,
      passFactor,
      failureReason: `Missing required fields: ${missingFields.join(", ")}`
    };
  }
}

