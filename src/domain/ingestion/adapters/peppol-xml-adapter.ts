import { XMLParser } from "fast-xml-parser";
import { BaseFileAdapter } from "./base-file-adapter";
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

export class PeppolXmlAdapter extends BaseFileAdapter {
  private parser: XMLParser;

  constructor(storage: StorageAdapter) {
    super(storage);
    this.parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      parseTagValue: true,
      trimValues: true,
    });
  }

  describe(): ConnectorManifest {
    return {
      id: "peppol-xml-v1",
      displayName: "Peppol UBL 2.1 XML",
      version: "1.0.0",
      connectorType: "FILE_UPLOAD",
      authScheme: "NONE",
      extractionModes: ["FULL"],
      supportedDatasets: [
        {
          id: "ap-invoices",
          label: "AP Invoices",
          canonicalMappings: [] // No mapping wizard needed for standard XML
        }
      ],
      maxFileSizeMb: 5,
      maxRowsPerJob: FILE_LIMITS.MAX_INVOICES_XML,
      rateLimit: null,
      idempotencyKey: "source_record_id",
      requiresColumnMap: false
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
        const xmlString = buffer.toString('utf8');
        const parsed = this.parser.parse(xmlString);
        
        // Ensure it's a Peppol Invoice or CreditNote
        const invoice = parsed.Invoice || parsed.CreditNote;
        
        if (!invoice) {
          warnings.push(`File ${filePath} does not contain a valid UBL Invoice or CreditNote root element.`);
          continue;
        }

        rawRecords.push({
          _sourceId: filePath, // use filepath as a temporary source id
          ...invoice,
          _docType: parsed.Invoice ? "INVOICE" : "CREDIT_NOTE"
        });
        
        totalParsed++;
        
        if (totalParsed > FILE_LIMITS.MAX_INVOICES_XML) {
          throw new ConnectorError(
            "CE-004", 
            `Exceeded maximum allowed invoices per job (${FILE_LIMITS.MAX_INVOICES_XML}).`, 
            false
          );
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

    for (const record of raw) {
      try {
        const docNumber = record.ID;
        const docDateStr = record.IssueDate;
        
        if (!docNumber || !docDateStr) {
          rejectedRecords.push(record);
          errors.push(`Record missing mandatory ID or IssueDate: ${record._sourceId}`);
          continue;
        }

        const docDate = new Date(docDateStr);
        const currencyCode = record.DocumentCurrencyCode || "USD"; // Default fallback if missing, though UBL requires it
        
        const isCreditNote = record._docType === "CREDIT_NOTE";
        const docType: DocType = isCreditNote ? "CREDIT_NOTE" : "INVOICE";
        
        // Determine amounts from LegalMonetaryTotal
        const monetaryTotal = record.LegalMonetaryTotal || {};
        let grossAmount = parseFloat(monetaryTotal.TaxInclusiveAmount) || 0;
        let netAmount = parseFloat(monetaryTotal.TaxExclusiveAmount) || 0;
        
        // TaxTotal can be an array or object
        let taxAmount = 0;
        if (record.TaxTotal) {
          if (Array.isArray(record.TaxTotal)) {
            taxAmount = record.TaxTotal.reduce((sum: number, t: any) => sum + (parseFloat(t.TaxAmount) || 0), 0);
          } else {
            taxAmount = parseFloat(record.TaxTotal.TaxAmount) || 0;
          }
        }

        // Handle credit note signs (usually UBL credit notes represent positive amounts for the credit)
        // If the platform expects negative for credit notes, we can invert them here, or let the platform handle it.
        // We'll leave them as absolute values as defined in the document.

        // Extract counterparty (Supplier by default for AP)
        let counterpartyName = "Unknown";
        let counterpartyTaxId = "";
        
        if (record.AccountingSupplierParty?.Party) {
          const party = record.AccountingSupplierParty.Party;
          counterpartyName = party.PartyName?.Name || party.PartyLegalEntity?.RegistrationName || "Unknown";
          
          if (party.PartyTaxScheme) {
            const taxScheme = Array.isArray(party.PartyTaxScheme) ? party.PartyTaxScheme[0] : party.PartyTaxScheme;
            counterpartyTaxId = taxScheme.CompanyID || "";
          }
        }

        // In Peppol, base amounts are the same as local amounts unless it's a cross-border invoice 
        // with specific exchange rates provided. For V1, we assume 1.0 if not specified.
        const exchangeRate = 1.0; 

        const txn: CanonicalTransactionInput = {
          sourceConnectorId: "peppol-xml-v1",
          sourceRecordId: docNumber, // Peppol IDs are usually globally unique per issuer
          domainId: jobContext.orgId, // Typically set to some configured domain, fallback to org
          datasetLabel: "AP Invoices",
          
          docType,
          docNumber,
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
