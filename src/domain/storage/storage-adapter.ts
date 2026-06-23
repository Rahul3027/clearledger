/**
 * StorageAdapter — domain-layer interface.
 *
 * Domain logic imports ONLY this file. Never imports the Supabase SDK.
 * The Supabase implementation lives in:
 *   src/infrastructure/storage/supabase-storage-adapter.ts
 *
 * Swapping to S3, R2, or any other provider = rewrite one implementation file.
 */

export interface StorageResult {
  /** The storage key used to retrieve or delete this file */
  key: string;
  /** File size in bytes */
  sizeBytes: number;
  /** SHA-256 hex digest of the uploaded buffer — used for integrity verification */
  sha256: string;
}

export interface StorageAdapter {
  /**
   * Store a file buffer at the given key.
   * Key format: /{org_id}/{entity_id}/{domain_id}/{file_id}.{ext}
   *
   * Throws FileTooLargeError if buffer.length > FILE_LIMITS.MAX_FILE_SIZE_BYTES
   * Throws StorageError on upload failure
   */
  put(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<StorageResult>;

  /**
   * Generate a pre-signed download URL scoped to a single file.
   * The URL is valid for ttlSeconds and cannot be used to list or access other files.
   *
   * Throws StorageError if the key does not exist or signing fails.
   */
  signedUrl(key: string, ttlSeconds: number): Promise<string>;

  /**
   * Delete a file by key.
   * Used ONLY for cleanup of failed uploads. Never called on audit-related files.
   *
   * Throws StorageError on failure.
   */
  delete(key: string): Promise<void>;
}

// ─── File Limits — Hard constraints enforced by put() before any upload ──────

export const FILE_LIMITS = {
  /** 5 MB — absolute maximum file size */
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  /** 10,000 rows — enforced by adapter after parse, before transform */
  MAX_ROWS_CSV_XLSX: 10_000,
  /** 500 invoices — enforced by Peppol adapter after parse */
  MAX_INVOICES_XML: 500,
  /** Only the first sheet of an XLSX file is processed */
  MAX_SHEETS_XLSX: 1,
} as const;

// ─── Errors ───────────────────────────────────────────────────────────────────

export class FileTooLargeError extends Error {
  constructor(sizeBytes: number) {
    super(
      `File size ${sizeBytes} bytes exceeds the maximum allowed size of ` +
        `${FILE_LIMITS.MAX_FILE_SIZE_BYTES} bytes (${FILE_LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024} MB). ` +
        `Large file support is out of scope for MVP.`
    );
    this.name = "FileTooLargeError";
  }
}

export class TooManyRowsError extends Error {
  constructor(rowCount: number, limit: number) {
    super(
      `File contains ${rowCount} rows which exceeds the MVP limit of ${limit} rows. ` +
        `Large file support is out of scope for MVP.`
    );
    this.name = "TooManyRowsError";
  }
}

export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "StorageError";
  }
}
