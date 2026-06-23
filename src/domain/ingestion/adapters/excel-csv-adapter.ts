import * as xlsx from "xlsx";
import { BaseFileAdapter, ColumnMapping } from "./base-file-adapter";
import { 
  ConnectorManifest, 
  ExtractionJob, 
  ExtractionResult, 
  RawRecord, 
  TransformationResult,
  CanonicalTransactionInput,
  ConnectorError,
  DocType
} from "../types";
import { StorageAdapter, FILE_LIMITS } from "../../storage/storage-adapter";

export class ExcelCsvAdapter extends BaseFileAdapter {
  constructor(storage: StorageAdapter) {
    super(storage);
  }

  describe(): ConnectorManifest {
    return {
      id: "excel-csv-v1",
      displayName: "Excel / CSV Upload",
      version: "1.0.0",
      connectorType: "FILE_UPLOAD",
      authScheme: "NONE",
      extractionModes: ["FULL"],
      supportedDatasets: [
        {
          id: "generic-ledger",
          label: "Generic Ledger",
          canonicalMappings: ["docNumber", "docDate", "netAmount", "taxAmount", "grossAmount", "currencyCode"]
        }
      ],
      maxFileSizeMb: 5,
      maxRowsPerJob: FILE_LIMITS.MAX_ROWS_CSV_XLSX,
      rateLimit: null,
      idempotencyKey: "source_record_id", // Using pseudo-surrogate below if absent
      requiresColumnMap: true
    };
  }

  async extract(job: ExtractionJob): Promise<ExtractionResult> {
    if (!job.filePaths || job.filePaths.length === 0) {
      throw new ConnectorError("CE-004", "No file paths provided for extraction.", false);
    }

    const rawRecords: RawRecord[] = [];
    const warnings: string[] = [];
    let totalParsed = 0;

    for (const filePath of job.filePaths) {
      try {
        const buffer = await this.downloadFile(filePath);
        
        // Parse the workbook
        const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
        
        // Only process the first sheet per limits
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        if (workbook.SheetNames.length > FILE_LIMITS.MAX_SHEETS_XLSX) {
          warnings.push(`File ${filePath} has multiple sheets. Only the first sheet was processed.`);
        }

        // Convert to JSON
        const rows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet);
        
        for (let i = 0; i < rows.length; i++) {
          totalParsed++;
          if (totalParsed > FILE_LIMITS.MAX_ROWS_CSV_XLSX) {
            throw new ConnectorError(
              "CE-004", 
              `Exceeded maximum allowed rows per job (${FILE_LIMITS.MAX_ROWS_CSV_XLSX}).`, 
              false
            );
          }
          
          rawRecords.push({
            _sourceId: `${filePath}#row_${i + 2}`, // 1-indexed plus header
            ...rows[i]
          });
        }
      } catch (err) {
        if (err instanceof ConnectorError) {
          throw err;
        }
        warnings.push(`Failed to parse file ${filePath}: ${(err as Error).message}`);
      }
    }

    return {
      jobId: job.jobId,
      rawRecords,
      totalParsed,
      warnings
    };
  }

  async transform(raw: RawRecord[], jobContext: ExtractionJob): Promise<TransformationResult> {
    const canonicalTransactions: CanonicalTransactionInput[] = [];
    const quarantinedRecords: any[] = [];
    const rejectedRecords: any[] = [];
    const errors: string[] = [];

    const columnMapping = jobContext.config?.columnMapping as ColumnMapping;
    if (!columnMapping || !columnMapping.sourceColumns) {
      throw new ConnectorError("CE-005", "Column mapping is required for Excel/CSV adapter", false);
    }

    const sourceCols = columnMapping.sourceColumns;

    for (const record of raw) {
      try {
        const docNumber = record[sourceCols.docNumber];
        const docDateRaw = record[sourceCols.docDate];
        
        if (!docNumber || !docDateRaw) {
          rejectedRecords.push(record);
          errors.push(`Record missing mapped ID or Date: ${record._sourceId}`);
          continue;
        }

        // Handle date parsing (xlsx parser might have converted to JS Date already)
        let docDate: Date;
        if (docDateRaw instanceof Date) {
          docDate = docDateRaw;
        } else {
          docDate = new Date(docDateRaw);
        }

        if (isNaN(docDate.getTime())) {
          rejectedRecords.push(record);
          errors.push(`Invalid date format for record ${record._sourceId}`);
          continue;
        }

        const currencyCode = record[sourceCols.currencyCode] || "USD";
        
        const grossAmountRaw = record[sourceCols.grossAmount];
        const netAmountRaw = record[sourceCols.netAmount];
        const taxAmountRaw = record[sourceCols.taxAmount];
        
        let grossAmount = parseFloat(grossAmountRaw);
        let netAmount = parseFloat(netAmountRaw);
        let taxAmount = parseFloat(taxAmountRaw) || 0;

        if (isNaN(grossAmount)) grossAmount = 0;
        if (isNaN(netAmount)) netAmount = 0;

        const counterpartyName = record[sourceCols.counterpartyName] || "Unknown";
        const counterpartyTaxId = record[sourceCols.counterpartyTaxId] || "";
        
        const docTypeStr = record[sourceCols.docType];
        let docType: DocType = "OTHER";
        if (typeof docTypeStr === 'string') {
          const upper = docTypeStr.toUpperCase();
          if (["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE", "PAYMENT", "JOURNAL"].includes(upper)) {
            docType = upper as DocType;
          }
        } else {
          // If not mapped, default to INVOICE
          docType = "INVOICE";
        }

        const exchangeRate = parseFloat(record[sourceCols.exchangeRate]) || 1.0;

        const txn: CanonicalTransactionInput = {
          sourceConnectorId: "excel-csv-v1",
          sourceRecordId: docNumber, 
          domainId: jobContext.orgId, 
          datasetLabel: jobContext.config?.datasetLabel || "Generic Ledger",
          
          docType,
          docNumber: String(docNumber),
          docDate,
          
          counterpartyName,
          counterpartyTaxId,
          
          currencyCode,
          exchangeRate,
          netAmount,
          taxAmount,
          grossAmount,
          
          baseNetAmount: netAmount * exchangeRate,
          baseTaxAmount: taxAmount * exchangeRate,
          baseGrossAmount: grossAmount * exchangeRate,
        };

        canonicalTransactions.push(txn);
      } catch (err) {
        quarantinedRecords.push(record);
        errors.push(`Transformation failed for record ${record._sourceId}: ${(err as Error).message}`);
      }
    }

    return {
      canonicalTransactions,
      quarantinedRecords,
      rejectedRecords,
      errors
    };
  }
}
