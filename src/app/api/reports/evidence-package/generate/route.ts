/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { evidencePackages } from "@/infrastructure/db/schema/reporting";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { AuditEncoder } from "@/domain/workflow/audit-encoder";
import { EvidencePackager } from "@/domain/reporting/evidence-packager";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const orgId = request.headers.get("x-org-id");
  const actorId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { periodKey } = await request.json();
    if (!periodKey) return NextResponse.json({ error: "Missing periodKey" }, { status: 400 });

    return await withTenant(orgId, async (tx) => {
      // 1. Register Package
      const [pkg] = await tx.insert(evidencePackages).values({
        orgId,
        periodKey,
        requestedBy: actorId,
        status: "GENERATING"
      }).returning();

      // 2. Global Audit Emit
      const outboxEvent = AuditEncoder.encodeEvent(
        orgId, actorId, "EVIDENCE_PACKAGE_REQUESTED" as any, pkg.id, 
        undefined, { periodKey }
      );
      await tx.insert(auditOutbox).values(outboxEvent);

      // 3. Generate Archive asynchronously or wait (Since we are limited to Vercel, we must await within the execution window or use a background task)
      const storagePath = await EvidencePackager.generatePackage(tx, orgId, periodKey, pkg.id);

      // 4. Mark Ready
      const [updatedPkg] = await tx.update(evidencePackages)
        .set({ status: "READY", storagePath, completedAt: new Date() })
        .where(eq(evidencePackages.id, pkg.id))
        .returning();

      return NextResponse.json({ status: "SUCCESS", data: updatedPkg });
    });
  } catch (error) {
    console.error("Evidence Package Generate Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
