import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EvidencePackagesClient, EvidencePackageRow } from "@/components/compliance/evidence-packages-client";

const mockPackages: EvidencePackageRow[] = [
  { id: "PKG-MAY2025", period: "May 2025", status: "Generating", createdBy: "Sarah Jenkins", createdAt: "Today, 10:00 AM", size: "-", expiry: "Jun 30, 2025" },
  { id: "PKG-APR2025", period: "April 2025", status: "Ready", createdBy: "Alex Brown", createdAt: "May 1, 2025", size: "45.2 MB", expiry: "May 31, 2025" },
  { id: "PKG-MAR2025", period: "March 2025", status: "Failed", createdBy: "System", createdAt: "Apr 1, 2025", size: "-", expiry: "Apr 30, 2025" },
  { id: "PKG-FEB2025", period: "February 2025", status: "Expired", createdBy: "System", createdAt: "Mar 1, 2025", size: "38.1 MB", expiry: "Expired 15 days ago" },
];

export default async function EvidencePackagesPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <PageHeader 
          title="Evidence Packages" 
          description="Manage immutable exports of reconciliation activity for period-close and auditing."
        />
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Generate Package
        </Button>
      </div>

      <EvidencePackagesClient initialData={mockPackages} />
    </div>
  );
}
