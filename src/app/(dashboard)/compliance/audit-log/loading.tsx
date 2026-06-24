import { SkeletonHeader, SkeletonTable } from "@/components/ui/skeletons";

export default function AuditLogLoading() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <SkeletonHeader />
      <SkeletonTable rows={12} />
    </div>
  );
}
