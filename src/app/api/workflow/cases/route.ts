import { NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionCases } from "@/infrastructure/db/schema/workflow";

export async function GET(request: Request) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return await withTenant(orgId, async (tx) => {
      // In V1, return a flat list bounded to 1000 items. 
      // Pagination/filtering query params would be hooked here.
      const cases = await tx.select().from(exceptionCases).limit(1000);
      return NextResponse.json({ data: cases });
    });
  } catch (error) {
    console.error("Fetch Cases Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
