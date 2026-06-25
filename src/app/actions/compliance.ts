"use server";

import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { auditOutbox } from "@/infrastructure/db/schema";
import { revalidatePath } from "next/cache";

export async function generateEvidencePackageAction(formData: FormData) {
  const { user, orgId } = await getAuthenticatedTenant();
  const period = formData.get("period") as string;
  const description = formData.get("description") as string;

  await withTenant(orgId, async (tx) => {
    // We would insert into an evidencePackages table if it existed in the schema
    
    await tx.insert(auditOutbox).values({
      orgId,
      actorId: user.id,
      actorType: "USER",
      eventType: "EVIDENCE_PACKAGE_GENERATED",
      beforeState: { period, description }
    });
  });

  revalidatePath("/compliance");
}

