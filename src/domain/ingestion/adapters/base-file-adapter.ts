import { 
  ConnectorInterface, 
  ConnectorManifest, 
  ExtractionJob, 
  ExtractionResult, 
  RawRecord, 
  TransformationResult,
  ReportPayload,
  ConnectorError,
  TestResult
} from "../types";
import { StorageAdapter, FILE_LIMITS } from "../../storage/storage-adapter";

export interface ColumnMapping {
  sourceColumns: Record<string, string>;
  dateFormat?: string;
  numericLocale?: string;
}

export abstract class BaseFileAdapter implements ConnectorInterface {
  constructor(
    protected readonly storage: StorageAdapter
  ) {}

  abstract describe(): ConnectorManifest;

  async test(): Promise<TestResult> {
    // File upload connectors don't have active connectivity to test.
    // As long as the platform can reach its own storage, we are good.
    return { ok: true, latencyMs: 0 };
  }

  protected async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const url = await this.storage.signedUrl(filePath, 300); // 5 min TTL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      if (buffer.length > FILE_LIMITS.MAX_FILE_SIZE_BYTES) {
        throw new ConnectorError("CE-004", `File exceeds maximum size of ${FILE_LIMITS.MAX_FILE_SIZE_BYTES} bytes`, false);
      }
      
      return buffer;
    } catch (error) {
      if (error instanceof ConnectorError) {
        throw error;
      }
      throw new ConnectorError(
        "CE-003", 
        `Storage unavailable or file not found: ${error instanceof Error ? error.message : String(error)}`, 
        true
      );
    }
  }

  abstract extract(job: ExtractionJob): Promise<ExtractionResult>;

  abstract transform(raw: RawRecord[], jobContext: ExtractionJob): Promise<TransformationResult>;

  async report(payload: ReportPayload): Promise<void> {
    // In a real system, this would write to the Platform Observability Service
    // or update the ExtractionJob status in the database.
    // For now, we log it.
    console.log(`[Ingestion Report] Job ${payload.jobId} for connector ${payload.connectorId} completed.`);
    console.log(`Extracted: ${payload.rowsExtracted}, Mapped: ${payload.rowsMapped}, Rejected: ${payload.rowsRejected}`);
    if (payload.errors.length > 0) {
      console.error(`Errors:`, payload.errors);
    }
  }
}
