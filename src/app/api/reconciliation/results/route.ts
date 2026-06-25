/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { NextResponse } from "next/server";
import { db, withTenant } from "@/infrastructure/db/client";
import { reconciliationResults } from "@/infrastructure/db/schema/reconciliation";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  try {
    return await withTenant(orgId, async (tx) => {
      const query = tx.select().from(reconciliationResults);
      if (runId) {
        query.where(eq(reconciliationResults.runId, runId));
      }

      // V1: Limit to 1000 for simple testing without pagination parameters
      query.limit(1000);

      const records = await query;
      return NextResponse.json({ data: records });
    });
  } catch (error) {
    console.error("Fetch Results Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
