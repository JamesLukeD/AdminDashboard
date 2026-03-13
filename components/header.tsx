"use client";

import { DateRangePicker } from "./date-range-picker";
import type { DateRange } from "@/types/analytics";
import { RefreshCw, Terminal, Wifi } from "lucide-react";
import { useState, useEffect } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function Header({
  title,
  subtitle,
  dateRange,
  onDateRangeChange,
  onRefresh,
  loading,
}: HeaderProps) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!loading) setLastUpdated(new Date());
  }, [loading]);

  // Live clock tick every second for the terminal feel
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <header
      className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between gap-4"
      style={{ background: "#060a0f", borderBottom: "1px solid #1e2d3d" }}
    >
      <div className="min-w-0 flex items-center gap-3">
        <Terminal className="w-4 h-4 shrink-0" style={{ color: "#00ff88" }} />
        <div>
          <h1 className="text-sm font-bold leading-tight font-mono cursor-blink" style={{ color: "#e6edf3" }}>{title}</h1>
          {subtitle && <p className="font-mono mt-0.5" style={{ fontSize: "10px", color: "#484f58" }}>{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {lastUpdated && !loading && (
          <span className="hidden sm:flex items-center gap-1.5 font-mono px-2.5 py-1.5 rounded" style={{ fontSize: "10px", color: "#00ff88", background: "#0a1a12", border: "1px solid #1a3a2a" }}>
            <Wifi className="w-3 h-3" />
            {formatTime(lastUpdated)}
          </span>
        )}
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        {onRefresh && (
          <button
            onClick={() => { onRefresh(); }}
            disabled={loading}
            className="p-2 rounded transition-all disabled:opacity-40"
            style={{ color: "#8b949e", border: "1px solid #21262d", background: "#0d1117" }}
            title="Refresh data"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00ff8866")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#21262d")}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} style={loading ? { color: "#00ff88" } : {}} />
          </button>
        )}
      </div>
    </header>
  );
}
