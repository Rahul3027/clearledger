/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { CanonicalTransactionInput } from "../ingestion/types";

export type DqAction = "ADMITTED" | "ADMITTED_WITH_WARNING" | "QUARANTINED" | "REJECTED";

export interface DqRuleResult {
  ruleName: string;
  passFactor: number; // 1.0 (pass), 0.5 (warning), 0.0 (fail)
  failureReason?: string;
}

export interface DqEngineResult {
  score: number;
  action: DqAction;
  rulesEvaluated: DqRuleResult[];
  engineVersion: string;
}

export interface DqRuleConfig {
  name: string;
  weight: number;
  params?: Record<string, any>;
}

export interface DqDomainConfig {
  domainId: string;
  admissionThreshold: number; // e.g. 70
  quarantineThreshold: number; // e.g. 50
  rules: DqRuleConfig[];
}

export interface DqRuleInterface {
  name: string;
  evaluate(transaction: CanonicalTransactionInput, params?: Record<string, any>): DqRuleResult;
}

