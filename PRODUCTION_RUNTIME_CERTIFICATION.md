# Production Security & Runtime Certification

## Executive Summary

ClearLedger has undergone a comprehensive production security and runtime certification audit. The evaluation focused on three primary areas: Server Action Authentication, Server Component Tenant Isolation, and Production Database connection management. 

The audit reveals that while the **API route authentication chain is secure** (utilizing middleware-enforced header stripping, JWT-based tenant extraction, and transaction-bound RLS initialization via `withTenant`), the **Server Actions and Server Components layers bypass authentication and tenant isolation completely**. 

Consequently, the application is **NOT READY** for production or staging deployment. Unauthenticated database writes are possible via Server Actions, and tenant data leakage is a critical risk across all dashboard Server Component pages. 

---

## Findings

### Workstream 1 — Server Action Authentication Audit

Every Server Action under `src/app/actions/` was audited. The findings show that:
1. **No session verification or user authentication is performed.** No checks are made against Supabase Auth (e.g., `getUser()`), and request cookies/headers are not inspected.
2. **Tenant context (`orgId`) is hardcoded to the default organization** (`"00000000-0000-0000-0000-000000000001"`).
3. **RLS context is bypassed** because the database is accessed using the raw `db.transaction()` wrapper instead of `withTenant()`.

#### Server Action Audit Matrix

| Action | Authentication | Authorization | Tenant Source | Status |
| :--- | :--- | :--- | :--- | :--- |
| `generateEvidencePackageAction` | None (Bypassed) | None (Bypassed) | Hardcoded `orgId` | **DEFECTIVE / VULNERABLE** |
| `triggerSyncAction` | None (Bypassed) | None (Bypassed) | Hardcoded `orgId` | **DEFECTIVE / VULNERABLE** |
| `disableConnectorAction` | None (Bypassed) | None (Bypassed) | Hardcoded `orgId` | **DEFECTIVE / VULNERABLE** |
| `assignExceptionAction` | None (Bypassed) | None (Bypassed) | Hardcoded `orgId` | **DEFECTIVE / VULNERABLE** |
| `resolveExceptionAction` | None (Bypassed) | None (Bypassed) | Hardcoded `orgId` | **DEFECTIVE / VULNERABLE** |
| `uploadFileAction` | None (Bypassed) | None (Bypassed) | Hardcoded `orgId` | **DEFECTIVE / VULNERABLE** |
| `createManualMatchAction` | None (Bypassed) | None (Bypassed) | Hardcoded `orgId` | **DEFECTIVE / VULNERABLE** |

---

### Workstream 2 — Server Component Tenant Audit

All Server Component pages under `src/app/(dashboard)/` were audited. 
* **Zero Server Component pages initialize RLS context or use `withTenant()`.** 
* All database reads are performed using the raw `db` client imported from `@/infrastructure/db/client`.
* If the database client executes under a PostgreSQL role that bypasses RLS (such as the default `postgres` owner/superuser role in local/development environments), these queries return data across **all tenants**, resulting in cross-tenant data leaks.
* If executed under a restricted role where RLS is enforced, these queries return **zero rows** because `app.current_org_id` is never initialized for the connection.

#### Server Component Page Audit Matrix

| Page | DB Query | Tenant Context | RLS | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | `exceptionCases` (count & list), `reconciliationRuns` (count), `auditEvents` (list) | Missing (Ignored) | Not Initialized | **DEFECTIVE / LEAK RISK** |
| `/exceptions` | `exceptionCases` (count & list) | Missing | Not Initialized | **DEFECTIVE / LEAK RISK** |
| `/exceptions/[id]` | `exceptionCases` (single row fetch) | Missing | Not Initialized | **DEFECTIVE / LEAK RISK** |
| `/reconciliation` | `reconciliationRuns` (count & list) | Missing | Not Initialized | **DEFECTIVE / LEAK RISK** |
| `/reconciliation/runs/[id]` | `reconciliationRuns` (single), `reconciliationResults` (list) | Missing | Not Initialized | **DEFECTIVE / LEAK RISK** |
| `/ingestion` | `extractionJobs` (count & list) | Missing | Not Initialized | **DEFECTIVE / LEAK RISK** |
| `/connectors` | `connectors` (count & list) | Missing | Not Initialized | **DEFECTIVE / LEAK RISK** |
| `/connectors/[id]` | `connectors` (single), `extractionJobs` (list) | Missing | Not Initialized | **DEFECTIVE / LEAK RISK** |
| `/compliance` | `exceptionCases` (count), `auditEvents` (count & list) | Missing | Not Initialized | **DEFECTIVE / LEAK RISK** |
| `/compliance/evidence-packages` | None (Uses static mock data) | None | N/A | **SECURE** |
| `/compliance/evidence-packages/[id]` | None (Uses static mock data) | None | N/A | **SECURE** |
| `/compliance/audit-log` | `auditEvents` (count & list) | Missing | Not Initialized | **DEFECTIVE / LEAK RISK** |

#### Missing Tenant Context Request Trace
When a request is made to `/exceptions` (with a valid user session belonging to `org-2`):
```
Request to /exceptions (Session Cookie present)
  → middleware.ts (strips headers, extracts JWT claims: user.id = "user-123", org_id = "org-2")
  → middleware.ts injects x-org-id: "org-2" and x-user-id: "user-123" request headers
  → Server Component (src/app/(dashboard)/exceptions/page.tsx)
      → Bypasses request headers entirely (does not read x-org-id)
      → Invokes raw db client: db.select().from(exceptionCases)...
  → db/client.ts (Proxy routes query to drizzle instance)
      → Executes SQL on the database connection without SET LOCAL app.current_org_id
  → Database SQL: SELECT * FROM "exception_cases" LIMIT 10 OFFSET 0;
      → Under superuser / owner role: Bypasses RLS policy and returns ALL records from ALL tenants (Data Leak)
      → Under restricted RLS role: Evaluates USING clause to NULL and returns 0 rows (Empty State)
```

---

### Workstream 3 — Production Database Validation

Audit of the database client config in `src/infrastructure/db/client.ts`:

1. **Lazy Initialization**: Correctly implemented using a JavaScript `Proxy` object on the exported `db` variable. The connection pool `_db` is initialized on first database access. This prevents crashes during `next build` static page generation if `DATABASE_URL` is not present in the environment (falling back gracefully via try/catch blocks).
2. **Connection Lifecycle**: Uses `postgres` client with `prepare: false` (appropriate for Supabase pgBouncer transaction mode) and `max: 5` (caps concurrent serverless connections to prevent pool exhaustion). The pool is cached globally and reused.
3. **Transactions & withTenant()**: `withTenant()` opens a database transaction and executes `SET LOCAL app.current_org_id = ${orgId}`.
4. **Nested Transactions**: Drizzle ORM's `.transaction()` implementation leverages PostgreSQL `SAVEPOINT`s for nested transactions.
5. **Rollback Behavior & Error Propagation**: Drizzle automatically issues a `ROLLBACK` to the connection if the transaction callback throws an error, and propagates the error up the call stack correctly.
6. **Production Risks**:
   * **Direct `db` Imports**: Since `db` is globally exported, there is no static check preventing developers from importing `db` directly (bypassing `withTenant`), which is the exact source of all tenant isolation bypasses in Server Components.
   * **Context Separation Risk**: If queries inside a `withTenant` callback accidentally reference the global `db` variable instead of the passed transaction `tx` argument, Drizzle will run those queries outside the transaction pool connection where `app.current_org_id` is NOT set, completely bypassing RLS.

---

### Workstream 4 — Security Review

#### P0 — Critical
* **SEC-P0-1: Server Actions Bypass Authentication and Tenant Context**
  * *Evidence*: [compliance.ts:9](file:///d:/VAT-tool/clearledger/src/app/actions/compliance.ts#L9), [connectors.ts:9](file:///d:/VAT-tool/clearledger/src/app/actions/connectors.ts#L9), [exceptions.ts:17](file:///d:/VAT-tool/clearledger/src/app/actions/exceptions.ts#L17), [ingestion.ts:8](file:///d:/VAT-tool/clearledger/src/app/actions/ingestion.ts#L8), and [reconciliation.ts:10](file:///d:/VAT-tool/clearledger/src/app/actions/reconciliation.ts#L10) all hardcode `orgId` to `"00000000-0000-0000-0000-000000000001"` and execute queries using raw `db.transaction()` instead of `withTenant()`. They contain no session validation.
  * *Impact*: Any anonymous user can trigger state updates (assign exceptions, manual match transactions, trigger syncs, upload files) affecting the default tenant without a valid session.
* **SEC-P0-2: Server Component Pages Bypass Row Level Security**
  * *Evidence*: All 10 active Server Component pages query using the raw `db` export directly without setting the local RLS variable `app.current_org_id` via `withTenant()`.
  * *Impact*: Cross-tenant data leak if database role bypasses RLS (as with default superusers/owners), or empty page states if the role is restricted.
* **SEC-P0-3: Local `/login` Page Uses Unsecured `getSession()` Session Retrieval**
  * *Evidence*: [login/page.tsx:31](file:///d:/VAT-tool/clearledger/src/app/login/page.tsx#L31): Calls `supabase.auth.getSession()` which reads the JWT from local storage/cookie without server-side validation.
  * *Impact*: A compromised or forged JWT cookie will pass this validation check. (Note: Middleware correctly uses `getUser()` which is secure).

#### P1 — High
* **SEC-P1-1: Webhook Ingest trusts Client-Supplied Tenant Header**
  * *Evidence*: [webhooks/[provider]/route.ts:14](file:///d:/VAT-tool/clearledger/src/app/api/webhooks/%5Bprovider%5D/route.ts#L14): Extracts `orgId` directly from the `x-org-id` request header.
  * *Impact*: Public webhooks bypass the middleware check matcher. External callers can craft requests and pass arbitrary `x-org-id` values to ingest data into other tenants.
* **SEC-P1-2: Webhook HMAC Signature Validation Webhook Secret Fallback**
  * *Evidence*: [webhooks/[provider]/route.ts:30](file:///d:/VAT-tool/clearledger/src/app/api/webhooks/%5Bprovider%5D/route.ts#L30): Falls back to a well-known default string `"mvp-secret-key"` if the environment variable `WEBHOOK_SECRET` is unset.
  * *Impact*: Promotes weak configuration defaults in staging and production if the environment variable is omitted.
* **SEC-P1-3: Integration Test Suite Failures**
  * *Evidence*: running `npm run test` fails with 6 test failures:
    * DQE Integration: `Ingestion Job Error: Error: [vitest] No "withTenant" export is defined on the "@/infrastructure/db/client" mock.`
    * Reconciliation Integration: `Reconciliation Run Error: Error: [vitest] No "withTenant" export is defined...`
    * Workflow Integration: `Upload Attachment Error: TypeError: storage.put is not a function` (mocked storage defines `uploadFile` but route calls `put`).
    * Reconciliation runs: `TypeError: sourceRecordsDb.map is not a function` in `src/app/api/reconciliation/run/route.ts` line 84.
  * *Impact*: The code cannot be certified as stable when the integration test suite is failing.

#### P2 — Medium
* **SEC-P2-1: Unauthenticated Health API accesses Database**
  * *Evidence*: [health/route.ts:6](file:///d:/VAT-tool/clearledger/src/app/api/health/route.ts#L6) executes `db.execute(sql`SELECT 1`)` to check database status on an unauthenticated endpoint.
  * *Impact*: Deny of service risk by database connection exhaustion if the endpoint is flooded.
* **SEC-P2-2: Duplicate Login Paths**
  * *Evidence*: Both `/login` (SSR, light design) and `/auth/login` (CSR, dark design) routes are present. Middleware redirects unauthenticated users to `/login`.
  * *Impact*: Inconsistent security patterns and confusing operator user experience.

---

## Evidence

### 1. Server Action Defect Example (Exceptions Action)
Source: [exceptions.ts:15-33](file:///d:/VAT-tool/clearledger/src/app/actions/exceptions.ts#L15-L33)
```typescript
export async function assignExceptionAction(formData: FormData) {
  // In a real app, we'd get the orgId and userId from the auth session
  const orgId = "00000000-0000-0000-0000-000000000001";
  const actorId = "system";

  const parsed = assignSchema.parse({
    caseId: formData.get("caseId"),
    userId: formData.get("userId"),
  });

  await db.transaction(async (tx) => {
    // 1. Update case
    await tx.update(exceptionCases)
      .set({ 
        assignedTo: parsed.userId,
        status: "IN_REVIEW",
        assignedAt: new Date()
      })
      .where(eq(exceptionCases.id, parsed.caseId));
```

### 2. Server Component Defect Example (Dashboard Page)
Source: [dashboard/page.tsx:13-29](file:///d:/VAT-tool/clearledger/src/app/(dashboard)/dashboard/page.tsx#L13-L29)
```typescript
export default async function DashboardOverviewPage() {
  const orgId = "00000000-0000-0000-0000-000000000001"; // In real app, from auth session
  
  let openExceptionsCount = 0;
  let totalReconCount = 0;
  let recentExceptions: any[] = [];
  let recentAuditEvents: any[] = [];

  try {
    const [{ value: exceptionCount }] = await db.select({ value: count() }).from(exceptionCases).where(eq(exceptionCases.status, "OPEN"));
    openExceptionsCount = exceptionCount;

    const [{ value: reconCount }] = await db.select({ value: count() }).from(reconciliationRuns);
    totalReconCount = reconCount;

    recentExceptions = await db.select().from(exceptionCases).orderBy(desc(exceptionCases.createdAt)).limit(3);
    recentAuditEvents = await db.select().from(auditEvents).orderBy(desc(auditEvents.ts)).limit(3);
```

### 3. Integration Test Failure Example
```
Reconciliation Run Error: Error: [vitest] No "withTenant" export is defined on the "@/infrastructure/db/client" mock. Did you forget to return it from "vi.mock"?
```

---

## Risk Register

| Risk ID | Vulnerability | Severity | Probability | Impact | Mitigation Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Unauthenticated Database Write via Server Actions | **P0 (Critical)** | High | High | Unmitigated |
| **RSK-02** | Cross-Tenant Database Reads via Server Component Pages | **P0 (Critical)** | High | High | Unmitigated |
| **RSK-03** | Weak JWT Session Token Verification in `/login` Page | **P0 (Critical)** | Medium | High | Unmitigated |
| **RSK-04** | Webhook Tenant Claim Spoofing | **P1 (High)** | Medium | High | Unmitigated |
| **RSK-05** | Webhook HMAC Secret Default Fallback Key | **P1 (High)** | Low | High | Unmitigated |
| **RSK-06** | Database Connection Exhaustion via Public Health Endpoint | **P2 (Medium)** | Medium | Low | Unmitigated |

---

## Required Fixes

To achieve staging or production readiness, the following fixes are **mandatory**:

1. **Secure Server Actions**:
   * Integrate Supabase server client authentication checking inside all actions using `supabase.auth.getUser()`.
   * Extract `orgId` from the authenticated user's metadata instead of using hardcoded variables.
   * Wrap transaction logic in `withTenant(orgId, tx => { ... })` instead of raw `db.transaction`.
2. **Secure Server Components**:
   * Read the authenticated user session from headers or cookies in layout/pages.
   * Wrap database queries in `withTenant(orgId, async (tx) => { ... })` and execute all selects/counts using the transaction `tx` argument instead of global `db`.
3. **Fix `/login` Page Auth**:
   * Replace `supabase.auth.getSession()` with `supabase.auth.getUser()` in `src/app/login/page.tsx`.
4. **Repair Integration Test Mocking**:
   * Add `withTenant` exports to the mocks in `src/domain/dqe/dqe-integration.test.ts` and `src/domain/reconciliation/reconciliation-integration.test.ts`.
   * Fix the mock storage adapter in `src/domain/workflow/workflow-integration.test.ts` to implement `.put(...)` instead of `.uploadFile(...)`.

---

## Recommended Fixes

1. **Clean Duplicate Auth Pages**:
   * Delete `/login` and consolidate all middleware auth redirects to `/auth/login`, ensuring a single high-fidelity, secure CSR authentication screen is used.
2. **Secure Webhook Verification**:
   * Remove the fallback default signature key `"mvp-secret-key"` and enforce that signature validation strictly fails if `WEBHOOK_SECRET` is unset.
   * Look up tenant credentials from a secure credential store to match incoming webhook payloads instead of accepting client-supplied `x-org-id` headers.
3. **Global Signout**:
   * Enable global scope option `{ scope: 'global' }` on logout to invalidate active session tokens across all devices.

---

## Final Certification

### NOT READY

ClearLedger **cannot** be certified for staging, UAT, or production deployment in its current state. The P0 security findings demonstrate unauthenticated write access paths and complete bypasses of database RLS isolation contexts in both Server Actions and Server Components.
