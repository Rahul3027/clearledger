import { pgTable, uuid, text, timestamp, boolean, jsonb, numeric, integer, date } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { entities } from "./entities";

export const connectors = pgTable("connectors", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  displayName: text("display_name").notNull(),
  connectorType: text("connector_type").notNull(),
  authScheme: text("auth_scheme").notNull(),
  config: jsonb("config").notNull().default({}),
  status: text("status", {
    enum: ["UNCONFIGURED", "CONFIGURED", "TESTING", "ACTIVE", "SUSPENDED", "RETIRED"]
  }).notNull().default("UNCONFIGURED"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const extractionJobs = pgTable("extraction_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  connectorId: uuid("connector_id").notNull().references(() => connectors.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED"]
  }).notNull().default("PENDING"),
  rowsExtracted: integer("rows_extracted").default(0),
  rowsMapped: integer("rows_mapped").default(0),
  rowsQuarantined: integer("rows_quarantined").default(0),
  rowsRejected: integer("rows_rejected").default(0),
  errorDetails: jsonb("error_details"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const canonicalTransactions = pgTable("canonical_transactions", {
  platformId: uuid("platform_id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  stableIdentityKey: text("stable_identity_key").notNull().unique(),
  sourceConnectorId: text("source_connector_id").notNull(),
  sourceRecordId: text("source_record_id"),
  domainId: text("domain_id").notNull(),
  datasetLabel: text("dataset_label").notNull(),
  
  docType: text("doc_type", {
    enum: ["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE", "PAYMENT", "JOURNAL", "OTHER"]
  }).notNull(),
  docNumber: text("doc_number").notNull(),
  docDate: date("doc_date").notNull(),
  periodKey: text("period_key").notNull(),
  
  counterpartyName: text("counterparty_name"),
  counterpartyTaxId: text("counterparty_tax_id"),
  counterpartyId: text("counterparty_id"),
  
  currencyCode: text("currency_code").notNull(),
  exchangeRate: numeric("exchange_rate").notNull(),
  netAmount: numeric("net_amount").notNull(),
  taxAmount: numeric("tax_amount"),
  grossAmount: numeric("gross_amount").notNull(),
  
  baseNetAmount: numeric("base_net_amount").notNull(),
  baseTaxAmount: numeric("base_tax_amount"),
  baseGrossAmount: numeric("base_gross_amount").notNull(),
  
  accountCode: text("account_code"),
  costCentre: text("cost_centre"),
  referenceDocNumber: text("reference_doc_number"),
  lineItems: jsonb("line_items"),
  customFields: jsonb("custom_fields"),
  
  dataQualityScore: integer("data_quality_score"),
  peppolSigStatus: text("peppol_sig_status", {
    enum: ["VALID", "INVALID", "UNVERIFIABLE", "N/A"]
  }),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  ingestedBy: text("ingested_by").notNull(),
  isPiiMasked: boolean("is_pii_masked").notNull().default(false),
  
  dqAction: text("dq_action", {
    enum: ["ADMITTED", "ADMITTED_WITH_WARNING", "QUARANTINED", "REJECTED"]
  }).notNull().default("QUARANTINED"),
  normalizationWarnings: jsonb("normalization_warnings"),
});

export type Connector = typeof connectors.$inferSelect;
export type NewConnector = typeof connectors.$inferInsert;
export type ExtractionJob = typeof extractionJobs.$inferSelect;
export type NewExtractionJob = typeof extractionJobs.$inferInsert;
export type CanonicalTransactionDB = typeof canonicalTransactions.$inferSelect;
export type NewCanonicalTransactionDB = typeof canonicalTransactions.$inferInsert;
