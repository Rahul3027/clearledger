/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { SkeletonHeader, SkeletonCard, SkeletonTable } from "@/components/ui/skeletons";

export default function ComplianceLoading() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <SkeletonHeader />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 shrink-0">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[400px]">
        <div className="w-full lg:w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-4 space-y-4">
           <div className="h-6 w-1/3 bg-gray-200 animate-pulse rounded" />
           <div className="h-20 w-full bg-gray-200 animate-pulse rounded" />
           <div className="h-20 w-full bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="w-full lg:w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-4 space-y-4">
           <div className="h-6 w-1/3 bg-gray-200 animate-pulse rounded" />
           <div className="flex gap-4 items-start pt-2">
             <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
             <div className="space-y-2 flex-1"><div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" /><div className="h-3 w-3/4 bg-gray-200 animate-pulse rounded" /></div>
           </div>
           <div className="flex gap-4 items-start pt-2">
             <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
             <div className="space-y-2 flex-1"><div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" /><div className="h-3 w-3/4 bg-gray-200 animate-pulse rounded" /></div>
           </div>
        </div>
      </div>
    </div>
  );
}
