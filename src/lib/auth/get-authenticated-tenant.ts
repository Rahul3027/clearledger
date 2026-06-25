import { createSupabaseServerClient } from "@/infrastructure/auth/supabase-server";
import { withTenant } from "@/infrastructure/db/client";
import { entities } from "@/infrastructure/db/schema/entities";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

export async function getAuthenticatedTenant() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Unauthorized: Invalid session");
  }
  
  const orgId = user.user_metadata?.org_id;
  if (!orgId) {
    throw new Error("Unauthorized: Missing organization context");
  }

  // Retrieve cookie for selected entity
  const cookieStore = cookies();
  const selectedEntityId = cookieStore.get("selected_entity_id")?.value;

  // Retrieve a valid entityId for this organization under tenant context
  const entityId = await withTenant(orgId, async (tx) => {
    if (selectedEntityId) {
      const matched = await tx
        .select()
        .from(entities)
        .where(eq(entities.id, selectedEntityId))
        .limit(1);
      if (matched.length > 0) {
        return matched[0].id;
      }
    }
    const matched = await tx.select().from(entities).limit(1);
    return matched[0]?.id || null;
  });

  return {
    user,
    orgId,
    entityId,
  };
}

