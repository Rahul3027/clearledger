import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { fontSize: 24, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  section: { margin: 10, padding: 10 },
  label: { fontSize: 12, color: 'gray', marginBottom: 4 },
  value: { fontSize: 14, marginBottom: 15 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 10, textAlign: 'center', color: 'gray' }
});

interface SummaryReportProps {
  orgId: string;
  periodKey: string;
  generatedAt: string;
  totalTransactions: number;
  manualOverrideCount: number;
  matchRate: number;
}

export const SummaryReportDocument: React.FC<SummaryReportProps> = ({
  orgId, periodKey, generatedAt, totalTransactions, manualOverrideCount, matchRate
}) => {
  return React.createElement(Document, null, 
    React.createElement(Page, { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.header }, "ClearLedger Evidence Package"),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.label }, "Organization ID"),
        React.createElement(Text, { style: styles.value }, orgId),
        React.createElement(Text, { style: styles.label }, "Period Key"),
        React.createElement(Text, { style: styles.value }, periodKey),
        React.createElement(Text, { style: styles.label }, "Generation Timestamp"),
        React.createElement(Text, { style: styles.value }, generatedAt)
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.label }, "Total Ingested Volume"),
        React.createElement(Text, { style: styles.value }, totalTransactions),
        React.createElement(Text, { style: styles.label }, "Match Rate"),
        React.createElement(Text, { style: styles.value }, `${matchRate.toFixed(2)}%`),
        React.createElement(Text, { style: styles.label }, "Manual Workflow Overrides"),
        React.createElement(Text, { style: styles.value }, manualOverrideCount)
      ),
      React.createElement(Text, { style: styles.footer }, 
        "This package contains immutable CSV and JSON exports of the reconciliation engine, exceptions queue, and the audit outbox for external compliance."
      )
    )
  );
};
