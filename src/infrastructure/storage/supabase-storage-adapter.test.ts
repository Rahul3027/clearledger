import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FILE_LIMITS,
  FileTooLargeError,
  StorageError,
} from "@/domain/storage/storage-adapter";
import { SupabaseStorageAdapter } from "@/infrastructure/storage/supabase-storage-adapter";

// ── Mock Supabase client ──────────────────────────────────────────────────────
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })),
    },
  })),
}));

// Set required env vars
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  process.env.STORAGE_BUCKET = "clearledger-files";
});

describe("SupabaseStorageAdapter", () => {
  describe("put()", () => {
    it("accepts a file within the size limit", async () => {
      const adapter = new SupabaseStorageAdapter();
      const buffer = Buffer.alloc(1024, "a"); // 1 KB

      const result = await adapter.put(
        "/org-1/entity-1/domain-1/file-1.csv",
        buffer,
        "text/csv"
      );

      expect(result.sizeBytes).toBe(1024);
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/); // valid SHA-256
      expect(result.key).toBe("/org-1/entity-1/domain-1/file-1.csv");
    });

    it("throws FileTooLargeError when buffer exceeds MAX_FILE_SIZE_BYTES", async () => {
      const adapter = new SupabaseStorageAdapter();
      // 1 byte over the limit
      const buffer = Buffer.alloc(FILE_LIMITS.MAX_FILE_SIZE_BYTES + 1, "x");

      await expect(
        adapter.put("/org-1/entity-1/domain-1/huge.csv", buffer, "text/csv")
      ).rejects.toThrow(FileTooLargeError);
    });

    it("throws FileTooLargeError with a descriptive message", async () => {
      const adapter = new SupabaseStorageAdapter();
      const oversizedBuffer = Buffer.alloc(
        FILE_LIMITS.MAX_FILE_SIZE_BYTES + 100,
        "x"
      );

      await expect(
        adapter.put("/org/entity/domain/file.csv", oversizedBuffer, "text/csv")
      ).rejects.toThrow(/exceeds the maximum allowed size/);
    });

    it("computes a stable SHA-256 for identical inputs", async () => {
      const adapter = new SupabaseStorageAdapter();
      const content = "doc_number,amount\n1001,100.00\n";
      const buffer = Buffer.from(content, "utf-8");

      const r1 = await adapter.put("/a/b/c/f1.csv", buffer, "text/csv");
      const r2 = await adapter.put("/a/b/c/f2.csv", buffer, "text/csv");

      expect(r1.sha256).toBe(r2.sha256); // same content → same hash
    });
  });

  describe("signedUrl()", () => {
    it("returns a URL string", async () => {
      const adapter = new SupabaseStorageAdapter();
      const url = await adapter.signedUrl(
        "/org-1/entity-1/domain-1/file-1.csv",
        900
      );
      expect(url).toBe("https://example.com/signed");
    });

    it("throws StorageError when Supabase returns an error", async () => {
      const { createClient } = await import("@supabase/supabase-js");
      vi.mocked(createClient).mockReturnValueOnce({
        storage: {
          from: vi.fn(() => ({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "bucket not found" },
            }),
          })),
        },
      } as never);

      const adapter = new SupabaseStorageAdapter();
      await expect(adapter.signedUrl("/missing/key", 60)).rejects.toThrow(
        StorageError
      );
    });
  });

  describe("FILE_LIMITS constants", () => {
    it("MAX_FILE_SIZE_BYTES is 5 MB", () => {
      expect(FILE_LIMITS.MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
    });

    it("MAX_ROWS_CSV_XLSX is 10,000", () => {
      expect(FILE_LIMITS.MAX_ROWS_CSV_XLSX).toBe(10_000);
    });

    it("MAX_INVOICES_XML is 500", () => {
      expect(FILE_LIMITS.MAX_INVOICES_XML).toBe(500);
    });

    it("MAX_SHEETS_XLSX is 1", () => {
      expect(FILE_LIMITS.MAX_SHEETS_XLSX).toBe(1);
    });
  });
});
