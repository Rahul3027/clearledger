import { SkeletonHeader, SkeletonCard, SkeletonTable } from "@/components/ui/skeletons";

export default function ConnectorsLoading() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <SkeletonHeader />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 shrink-0">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <SkeletonTable rows={8} />
    </div>
  );
}
