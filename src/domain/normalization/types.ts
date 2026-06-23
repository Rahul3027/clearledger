import { CanonicalTransactionInput } from "../ingestion/types";

export interface NormalizationWarning {
  field: keyof CanonicalTransactionInput | "general";
  message: string;
  originalValue?: any;
}

export interface NormalizationResult {
  transaction: CanonicalTransactionInput;
  warnings: NormalizationWarning[];
}

export interface NormalizerInterface {
  normalize(transaction: CanonicalTransactionInput): NormalizationResult;
}
