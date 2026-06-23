import { CanonicalTransactionInput } from "../ingestion/types";
import { DqDomainConfig, DqEngineResult, DqRuleInterface } from "./types";
import { CompletenessRule } from "./rules/completeness";
import { ConsistencyRule } from "./rules/consistency";
import { TimelinessRule } from "./rules/timeliness";
import { ValidityRule } from "./rules/validity";

const ENGINE_VERSION = "v1.0.0";

export class DqeEngine {
  private rules: Map<string, DqRuleInterface>;
  private config: DqDomainConfig;

  constructor(config: DqDomainConfig) {
    this.config = config;
    this.rules = new Map();
    
    // Register built-in rules
    this.registerRule(new CompletenessRule());
    this.registerRule(new ConsistencyRule());
    this.registerRule(new TimelinessRule());
    this.registerRule(new ValidityRule());
  }

  public registerRule(rule: DqRuleInterface) {
    this.rules.set(rule.name, rule);
  }

  public evaluate(transaction: CanonicalTransactionInput): DqEngineResult {
    let totalWeight = 0;
    let earnedScore = 0;
    const ruleResults = [];

    for (const ruleConfig of this.config.rules) {
      const rule = this.rules.get(ruleConfig.name);
      if (!rule) {
        console.warn(`DQE Engine: Rule '${ruleConfig.name}' configured but not registered.`);
        continue;
      }

      const weight = ruleConfig.weight;
      totalWeight += weight;

      const result = rule.evaluate(transaction, ruleConfig.params);
      earnedScore += (result.passFactor * weight);
      ruleResults.push(result);
    }

    const finalScore = totalWeight > 0 ? (earnedScore / totalWeight) * 100 : 100;
    
    let action: DqEngineResult["action"] = "QUARANTINED";
    
    if (finalScore >= this.config.admissionThreshold) {
      action = "ADMITTED";
    } else if (finalScore >= 70) {
      // Hardcoded tiering logic for ADMITTED_WITH_WARNING since only 2 thresholds provided
      action = "ADMITTED_WITH_WARNING";
    } else if (finalScore >= this.config.quarantineThreshold) {
      action = "QUARANTINED";
    } else {
      action = "REJECTED";
    }

    return {
      score: Math.round(finalScore * 100) / 100,
      action,
      rulesEvaluated: ruleResults,
      engineVersion: ENGINE_VERSION
    };
  }
}
