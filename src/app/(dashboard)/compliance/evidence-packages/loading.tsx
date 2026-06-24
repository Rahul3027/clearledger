import { SkeletonHeader, SkeletonTable } from "@/components/ui/skeletons";

export default function EvidencePackagesLoading() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <SkeletonHeader />
      <SkeletonTable rows={10} />
    </div>
  );
}
