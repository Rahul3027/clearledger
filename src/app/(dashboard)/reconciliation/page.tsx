/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { cookies } from "next/headers";
import { withTenant } from "@/infrastructure/db/client";
import { canonicalTransactions, reconciliationResults } from "@/infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import { ReconciliationWorkstation, ReconciliationItem } from "@/components/reconciliation/reconciliation-workstation";

export default async function ReconciliationPage() {
  const { orgId, entityId } = await getAuthenticatedTenant();
  const cookieStore = cookies();
  const periodKey = cookieStore.get("selected_tax_period")?.value || "2026-06";
  
  let transactions: any[] = [];
  let reconResults: any[] = [];

  try {
    await withTenant(orgId, async (tx) => {
      transactions = await tx.select().from(canonicalTransactions)
        .where(
          and(
            eq(canonicalTransactions.orgId, orgId),
            entityId ? eq(canonicalTransactions.entityId, entityId) : undefined,
            eq(canonicalTransactions.periodKey, periodKey)
          )
        );

      reconResults = await tx.select().from(reconciliationResults)
        .where(
          and(
            eq(reconciliationResults.orgId, orgId),
            eq(reconciliationResults.periodKey, periodKey)
          )
        );
    });
  } catch (err) {
    console.error("Failed to query reconciliation results:", err);
  }

  // Map canonical records + matches into workstation structures
  const mappedResults: ReconciliationItem[] = transactions.map(tx => {
    // Find matching result where this transaction is the source uploader
    const result = reconResults.find(r => r.sourcePlatformId === tx.platformId);
    
    // Find the counterpart matched transaction
    const matchedTx = result?.targetPlatformId 
      ? transactions.find(t => t.platformId === result.targetPlatformId)
      : null;

    // Build timeline comments
    const commentsList = [];
    if (result && result.matchStatus === "MANUAL_MATCH") {
      commentsList.push({
        author: "System Engine",
        text: "Manual match overrides confirmed. Evidence package checklist locked.",
        date: "Recently"
      });
    }

    return {
      invoiceNumber: tx.docNumber,
      supplier: tx.docType === "INVOICE" ? tx.counterpartyName || "N/A" : "N/A",
      customer: tx.docType === "INVOICE" ? "Default Legal Entity" : tx.counterpartyName || "N/A",
      invoiceDate: tx.docDate,
      netAmount: tx.netAmount,
      vatAmount: tx.taxAmount || "0.00",
      grossAmount: tx.grossAmount,
      vatDifference: result?.amountVariance || "0.00",
      confidence: result?.confidenceScore || (result ? "1.00" : "0.00"),
      status: result?.matchStatus || "UNMATCHED",
      sourceSystem: tx.sourceConnectorId === "excel-csv-v1" ? "Excel Ingestion" : tx.sourceConnectorId,
      
      details: {
        platformId: tx.platformId,
        stableIdentityKey: tx.stableIdentityKey,
        currencyCode: tx.currencyCode,
        exchangeRate: tx.exchangeRate,
        accountCode: tx.accountCode,
        peppolSigStatus: tx.peppolSigStatus,
        ingestedAt: tx.ingestedAt?.toISOString() || new Date().toISOString(),
        ingestedBy: tx.ingestedBy
      },
      matchedCandidate: matchedTx ? {
        platformId: matchedTx.platformId,
        invoiceNumber: matchedTx.docNumber,
        netAmount: matchedTx.netAmount,
        vatAmount: matchedTx.taxAmount || "0.00",
        grossAmount: matchedTx.grossAmount,
        sourceSystem: matchedTx.sourceConnectorId === "excel-csv-v1" ? "Excel Ingestion" : matchedTx.sourceConnectorId
      } : null,
      matchingExplanation: result?.strategyUsed 
        ? `Transaction reconciled via ${result.strategyUsed} logic rules.` 
        : "Unreconciled invoice. DQE did not identify matching counterpart records.",
      comments: commentsList,
      auditEvents: []
    };
  });

  // Generate fallback items for demonstration if data list is empty
  const demoResults: ReconciliationItem[] = mappedResults.length > 0 ? mappedResults : [
    {
      invoiceNumber: "INV-2026-104",
      supplier: "Vertex Inc",
      customer: "Default Legal Entity",
      invoiceDate: "2026-06-15",
      netAmount: "1000.00",
      vatAmount: "200.00",
      grossAmount: "1200.00",
      vatDifference: "0.00",
      confidence: "1.00",
      status: "MATCHED",
      sourceSystem: "Excel Ingestion",
      details: {
        platformId: "db-txn-104",
        stableIdentityKey: "ident-key-104",
        currencyCode: "GBP",
        exchangeRate: "1.00",
        accountCode: "6100",
        peppolSigStatus: "VALID",
        ingestedAt: "2026-06-15T10:00:00.000Z",
        ingestedBy: "demo@clearledger.com"
      },
      matchedCandidate: {
        platformId: "db-txn-candidate-104",
        invoiceNumber: "INV-2026-104",
        netAmount: "1000.00",
        vatAmount: "200.00",
        grossAmount: "1200.00",
        sourceSystem: "NetSuite ERP"
      },
      matchingExplanation: "Transaction reconciled via EXACT matches strategy.",
      comments: [{ author: "System Engine", text: "Match completed successfully with 100% confidence.", date: "10:02:13" }],
      auditEvents: []
    },
    {
      invoiceNumber: "INV-2026-105",
      supplier: "Alpha LLC",
      customer: "Default Legal Entity",
      invoiceDate: "2026-06-16",
      netAmount: "500.00",
      vatAmount: "95.00",
      grossAmount: "595.00",
      vatDifference: "5.00",
      confidence: "0.85",
      status: "MATCHED_WITH_TOLERANCE",
      sourceSystem: "Excel Ingestion",
      details: {
        platformId: "db-txn-105",
        stableIdentityKey: "ident-key-105",
        currencyCode: "GBP",
        exchangeRate: "1.00",
        accountCode: "6200",
        peppolSigStatus: "N/A",
        ingestedAt: "2026-06-16T11:00:00.000Z",
        ingestedBy: "demo@clearledger.com"
      },
      matchedCandidate: {
        platformId: "db-txn-candidate-105",
        invoiceNumber: "INV-105-X",
        netAmount: "500.00",
        vatAmount: "100.00",
        grossAmount: "600.00",
        sourceSystem: "SAP S/4HANA"
      },
      matchingExplanation: "Transaction reconciled via FUZZY TOLERANCE strategy on amount margins.",
      comments: [{ author: "VAT Lead", text: "Variance of £5.00 falls within acceptable monthly close tolerance levels.", date: "Yesterday" }],
      auditEvents: []
    },
    {
      invoiceNumber: "INV-2026-106",
      supplier: "Stark Industries",
      customer: "Default Legal Entity",
      invoiceDate: "2026-06-17",
      netAmount: "3000.00",
      vatAmount: "600.00",
      grossAmount: "3600.00",
      vatDifference: "0.00",
      confidence: "0.00",
      status: "UNMATCHED",
      sourceSystem: "Excel Ingestion",
      details: {
        platformId: "db-txn-106",
        stableIdentityKey: "ident-key-106",
        currencyCode: "GBP",
        exchangeRate: "1.00",
        accountCode: "6300",
        peppolSigStatus: "INVALID",
        ingestedAt: "2026-06-17T12:00:00.000Z",
        ingestedBy: "demo@clearledger.com"
      },
      matchedCandidate: null,
      matchingExplanation: "DQE and Matching engine failed to identify matching counterpart transactions.",
      comments: [],
      auditEvents: []
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <PageHeader 
          title="VAT Reconciliation Workstation" 
          description={`Reconcile purchase invoices against tax sub-ledger logs for period ${periodKey}.`}
        />
      </div>

      <ReconciliationWorkstation initialData={demoResults} />
    </div>
  );
}

