import * as React from "react"
import { cn } from "@/lib/utils"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, description, trend, className, ...props }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md",
        className
      )}
      {...props}
    >
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-gray-900">{value}</span>
      </div>
      {(description || trend) && (
        <div className="mt-3 flex items-center text-sm">
          {trend && (
            <span
              className={cn(
                "font-medium flex items-center mr-2",
                trend.isPositive ? "text-green-700" : "text-red-700"
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {description && <span className="text-gray-500">{description}</span>}
        </div>
      )}
    </div>
  )
}
