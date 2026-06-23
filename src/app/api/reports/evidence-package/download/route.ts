import { NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { evidencePackages } from "@/infrastructure/db/schema/reporting";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { AuditEncoder } from "@/domain/workflow/audit-encoder";
import { eq, and } from "drizzle-orm";
import { getStorageAdapter } from "@/infrastructure/storage/supabase-storage-adapter";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const packageId = url.searchParams.get("packageId");
  
  const orgId = request.headers.get("x-org-id");
  const actorId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";

  if (!orgId || !packageId) {
    return NextResponse.json({ error: "Missing orgId or packageId" }, { status: 400 });
  }

  try {
    return await withTenant(orgId, async (tx) => {
      
      const [pkg] = await tx.select().from(evidencePackages)
        .where(and(eq(evidencePackages.id, packageId), eq(evidencePackages.orgId, orgId)));
        
      if (!pkg || pkg.status !== "READY" || !pkg.storagePath) {
        return NextResponse.json({ error: "Package not found or not ready" }, { status: 404 });
      }

      // Audit Emit
      const outboxEvent = AuditEncoder.encodeEvent(
        orgId, actorId, "EVIDENCE_PACKAGE_DOWNLOADED" as any, pkg.id, 
        undefined, undefined
      );
      await tx.insert(auditOutbox).values(outboxEvent);

      // In a real implementation we would stream the bytes via the StorageAdapter or redirect to a pre-signed URL.
      // For V1 compliance, we simulate returning the metadata required to fetch it.
      return NextResponse.json({ 
        data: {
          downloadUrl: `https://storage.clearledger.local/${pkg.storagePath}`,
          packageId: pkg.id
        }
      });
    });
  } catch (error) {
    console.error("Evidence Package Download Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
