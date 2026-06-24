import { SkeletonHeader, SkeletonSplitPane } from "@/components/ui/skeletons";

export default function ReconciliationRunDetailLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 shrink-0 border-b border-gray-200 bg-white">
         <SkeletonHeader />
      </div>
      <SkeletonSplitPane />
    </div>
  );
}
