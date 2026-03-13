"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded", className)} style={{ background: "#21262d" }} />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg p-5 flex flex-col gap-3" style={{ background: "#161b22", border: "1px solid #21262d" }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-9 rounded" />
      </div>
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div className="flex items-center justify-between py-2.5 gap-4" style={{ borderBottom: "1px solid #21262d" }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === 0 ? "flex-1" : "w-16 shrink-0"}`} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 justify-end", height)}>
      <div className="flex items-end gap-1 h-full px-2">
        {[55, 80, 45, 70, 90, 60, 75, 40, 85, 65, 95, 50].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t animate-pulse"
            style={{ height: `${h}%`, background: "#21262d", animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <div className="flex gap-1 px-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-2.5" />
        ))}
      </div>
    </div>
  );
}
