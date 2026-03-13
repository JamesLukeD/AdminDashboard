"use client";

import { cn } from "@/lib/utils";
import type { DateRange } from "@/types/analytics";

const ranges: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "28d", label: "28d" },
  { value: "90d", label: "90d" },
  { value: "180d", label: "180d" },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 rounded p-1" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
      {ranges.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={cn("px-3 py-1.5 rounded font-mono transition-all")}
          style={
            value === r.value
              ? { background: "#00ff88", color: "#060a0f", fontSize: "11px", fontWeight: 700, boxShadow: "0 0 8px #00ff8844" }
              : { color: "#484f58", fontSize: "11px", fontWeight: 500 }
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
