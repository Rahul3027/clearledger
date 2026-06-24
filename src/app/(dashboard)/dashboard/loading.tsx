import { SkeletonHeader, SkeletonCard, SkeletonTable } from "@/components/ui/skeletons";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <SkeletonHeader />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 shrink-0">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <div className="flex-1 flex gap-6 overflow-hidden min-h-[400px]">
        <div className="w-full lg:w-2/3 h-full flex">
          <SkeletonTable rows={8} />
        </div>
        <div className="w-full lg:w-1/3 h-full flex flex-col gap-6">
          <div className="flex-1 bg-white p-5 rounded-xl border border-gray-200 shadow-sm" />
          <div className="flex-1 bg-white p-5 rounded-xl border border-gray-200 shadow-sm" />
        </div>
      </div>
    </div>
  );
}
