import { DqDomainConfig } from "./types";

/**
 * Hardcoded JSON-based Data Quality Engine configuration.
 * In a future phase, this could be fetched from a database per-tenant.
 */
export const DEFAULT_DQE_CONFIG: DqDomainConfig = {
  domainId: "VAT",
  admissionThreshold: 90, // score >= 90 -> ADMITTED
  quarantineThreshold: 50, // 50 <= score < 90 -> QUARANTINED (or ADMITTED_WITH_WARNING depending on tiering)
  // Wait, let's refine: 
  // score >= 90: ADMITTED
  // score >= 70: ADMITTED_WITH_WARNING
  // score >= 50: QUARANTINED
  // score < 50: REJECTED
  
  rules: [
    {
      name: "completeness",
      weight: 40,
    },
    {
      name: "validity",
      weight: 20,
    },
    {
      name: "consistency",
      weight: 30,
    },
    {
      name: "timeliness",
      weight: 10,
    }
  ]
};
