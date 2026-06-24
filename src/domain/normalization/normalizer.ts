import { CanonicalTransactionInput, DocType } from "../ingestion/types";
import { NormalizationResult, NormalizerInterface, NormalizationWarning } from "./types";

/**
 * Normalization Service
 * Ensures records are uniformly formatted (dates, currencies, amounts, periods)
 * before passing to the Data Quality Engine.
 */
export class Normalizer implements NormalizerInterface {
  
  public normalize(transaction: CanonicalTransactionInput): NormalizationResult {
    const warnings: NormalizationWarning[] = [];
    const normalized = { ...transaction };

    // 1. Currency Normalization
    if (normalized.currencyCode) {
      const original = normalized.currencyCode;
      normalized.currencyCode = original.trim().toUpperCase();
      if (normalized.currencyCode.length !== 3) {
        warnings.push({
          field: "currencyCode",
          message: "Currency code does not appear to be standard ISO 4217 (length != 3)",
          originalValue: original
        });
      }
    } else {
      normalized.currencyCode = "XXX"; // Fallback placeholder
      warnings.push({ field: "currencyCode", message: "Missing currency code, defaulted to XXX" });
    }

    // 2. Amount Normalization & Exchange Rate Derivation
    if (normalized.exchangeRate === undefined || normalized.exchangeRate <= 0) {
      normalized.exchangeRate = 1.0;
      warnings.push({ field: "exchangeRate", message: "Exchange rate absent or invalid, defaulted to 1.0" });
    }

    // Rounding helper
    const round2 = (num: number) => Math.round(num * 100) / 100;

    normalized.grossAmount = round2(normalized.grossAmount || 0);
    normalized.netAmount = round2(normalized.netAmount || 0);
    
    if (normalized.taxAmount !== undefined && normalized.taxAmount !== null) {
      normalized.taxAmount = round2(normalized.taxAmount);
    }

    // Ensure base amounts exist
    if (normalized.baseGrossAmount === undefined) {
      normalized.baseGrossAmount = round2(normalized.grossAmount * normalized.exchangeRate);
    }
    if (normalized.baseNetAmount === undefined) {
      normalized.baseNetAmount = round2(normalized.netAmount * normalized.exchangeRate);
    }
    if (normalized.taxAmount !== undefined && normalized.taxAmount !== null && normalized.baseTaxAmount === undefined) {
      normalized.baseTaxAmount = round2(normalized.taxAmount * normalized.exchangeRate);
    }

    // 3. Document Type Normalization
    if (normalized.docType) {
      const upper = normalized.docType.toUpperCase().trim();
      const validTypes = ["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE", "PAYMENT", "JOURNAL", "OTHER"];
      if (validTypes.includes(upper)) {
        normalized.docType = upper as DocType;
      } else {
        warnings.push({
          field: "docType",
          message: `Unrecognized doc type mapped to OTHER`,
          originalValue: normalized.docType
        });
        normalized.docType = "OTHER";
      }
    } else {
      normalized.docType = "OTHER";
      warnings.push({ field: "docType", message: "Missing document type, defaulted to OTHER" });
    }

    // 4. Period Key Derivation
    if (!normalized.periodKey) {
      if (normalized.docDate) {
        const month = (normalized.docDate.getMonth() + 1).toString().padStart(2, '0');
        normalized.periodKey = `${normalized.docDate.getFullYear()}-${month}`;
      } else {
        normalized.periodKey = "UNKNOWN";
        warnings.push({ field: "periodKey", message: "Cannot derive period key due to missing docDate" });
      }
    }

    return {
      transaction: normalized,
      warnings
    };
  }
}
