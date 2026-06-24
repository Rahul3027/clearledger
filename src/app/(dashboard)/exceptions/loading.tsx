import { SkeletonHeader, SkeletonCard, SkeletonTable } from "@/components/ui/skeletons";

export default function ExceptionsLoading() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <SkeletonHeader />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <SkeletonTable rows={10} />
    </div>
  );
}
