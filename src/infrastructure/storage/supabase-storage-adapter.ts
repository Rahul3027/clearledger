import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import {
  type StorageAdapter,
  type StorageResult,
  FileTooLargeError,
  StorageError,
  FILE_LIMITS,
} from "@/domain/storage/storage-adapter";

/**
 * Supabase Storage implementation of StorageAdapter.
 *
 * INFRASTRUCTURE LAYER — this is the only file in the project that
 * imports from @supabase/supabase-js for storage purposes.
 *
 * To swap providers: replace this file with an S3Adapter, R2Adapter, etc.
 * that implements the same StorageAdapter interface.
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly bucket: string;
  private readonly client: ReturnType<typeof createClient>;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.STORAGE_BUCKET;

    if (!url || !key || !bucket) {
      throw new Error(
        "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_BUCKET"
      );
    }

    this.bucket = bucket;
    this.client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async put(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<StorageResult> {
    // Enforce file size limit BEFORE any upload attempt
    if (buffer.length > FILE_LIMITS.MAX_FILE_SIZE_BYTES) {
      throw new FileTooLargeError(buffer.length);
    }

    // Compute SHA-256 for integrity verification
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, buffer, {
        contentType,
        upsert: false, // Never silently overwrite existing files
      });

    if (error) {
      throw new StorageError(`Failed to upload file at key "${key}"`, error);
    }

    return { key, sizeBytes: buffer.length, sha256 };
  }

  async signedUrl(key: string, ttlSeconds: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, ttlSeconds);

    if (error || !data?.signedUrl) {
      throw new StorageError(
        `Failed to generate signed URL for key "${key}"`,
        error
      );
    }

    return data.signedUrl;
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([key]);

    if (error) {
      throw new StorageError(`Failed to delete file at key "${key}"`, error);
    }
  }
}

// Singleton — reused across warm serverless function invocations
let _adapter: SupabaseStorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!_adapter) {
    _adapter = new SupabaseStorageAdapter();
  }
  return _adapter;
}
