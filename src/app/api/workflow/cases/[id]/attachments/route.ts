/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionAttachments } from "@/infrastructure/db/schema/workflow";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { AuditEncoder } from "@/domain/workflow/audit-encoder";
import { getStorageAdapter } from "@/infrastructure/storage/supabase-storage-adapter";
import { randomUUID } from "crypto";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const orgId = request.headers.get("x-org-id");
  const actorId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Storage Upload (Phase 0 Adapter)
    const storage = getStorageAdapter();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create an immutable storage path
    const extension = file.name.split('.').pop();
    const immutablePath = `attachments/${params.id}/${randomUUID()}.${extension}`;
    
    await storage.uploadFile(orgId, immutablePath, buffer);

    // 2. Database Record
    return await withTenant(orgId, async (tx) => {
      
      const [attachment] = await tx.insert(exceptionAttachments).values({
        orgId,
        caseId: params.id,
        uploaderId: actorId,
        fileName: file.name,
        storagePath: immutablePath,
        mimeType: file.type || "application/octet-stream",
        fileSizeBytes: buffer.length
      }).returning();

      // 3. Global Audit Emit
      const outboxEvent = AuditEncoder.encodeEvent(
        orgId, actorId, "CASE_ATTACHMENT_ADDED", params.id, 
        undefined, 
        { attachmentId: attachment.id, fileName: attachment.fileName }
      );
      await tx.insert(auditOutbox).values(outboxEvent);

      return NextResponse.json({ status: "SUCCESS", data: attachment });
    });
  } catch (error: any) {
    console.error("Upload Attachment Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
