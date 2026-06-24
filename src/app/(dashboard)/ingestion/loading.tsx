import { SkeletonHeader, SkeletonTable } from "@/components/ui/skeletons";

export default function IngestionLoading() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <SkeletonHeader />
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 shrink-0 h-[180px] animate-pulse" />
      <SkeletonTable rows={8} />
    </div>
  );
}
