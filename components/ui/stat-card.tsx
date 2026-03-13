"use client";

import { cn, formatNumber } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changePeriod?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  subtitle?: string;
  highlight?: boolean;
}

// Map old Tailwind color classes → neon SIEM hex
const iconColorMap: Record<string, { fg: string; bg: string }> = {
  "text-blue-500":   { fg: "#79c0ff", bg: "#0a1420" },
  "text-purple-500": { fg: "#d2a8ff", bg: "#160a20" },
  "text-brand-500":  { fg: "#00ff88", bg: "#0a1a12" },
  "text-green-500":  { fg: "#56d364", bg: "#0a1a0a" },
  "text-orange-500": { fg: "#ffa657", bg: "#1a0e00" },
  "text-red-400":    { fg: "#ff7b72", bg: "#1e0a0a" },
  "text-indigo-500": { fg: "#a5d6ff", bg: "#0a1428" },
  "text-yellow-500": { fg: "#e3b341", bg: "#1a1400" },
  "text-teal-500":   { fg: "#39d0d4", bg: "#0a1a1a" },
};

export function StatCard({
  title,
  value,
  change,
  changePeriod = "vs prev. period",
  icon: Icon,
  iconColor = "text-brand-500",
  subtitle,
  highlight,
}: StatCardProps) {
  const numValue = typeof value === "number" ? value : parseFloat(String(value));
  const colors = iconColorMap[iconColor] ?? { fg: "#00ff88", bg: "#0a1a12" };

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral  = change !== undefined && change === 0;

  return (
    <div
      className={cn("rounded-lg p-5 flex flex-col gap-3 transition-all duration-200 group")}
      style={{
        background: "#161b22",
        border: highlight ? `1px solid ${colors.fg}44` : "1px solid #21262d",
        boxShadow: highlight ? `0 0 16px ${colors.fg}0f` : undefined,
      }}
    >
      <div className="flex items-start justify-between">
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: "10px", color: "#484f58" }}>{title}</span>
        <div className="p-2 rounded transition-transform group-hover:scale-110 duration-200" style={{ background: colors.bg, color: colors.fg }}>
          <Icon className="w-4 h-4" style={{ color: colors.fg }} />
        </div>
      </div>

      <div>
        <div className="font-mono font-bold tracking-tight" style={{ fontSize: "22px", color: colors.fg }}>
          {typeof value === "number" ? formatNumber(numValue) : value}
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono font-semibold"
              style={{
                fontSize: "10px",
                background: isPositive ? "#0a1a12" : isNegative ? "#1e0a0a" : "#161b22",
                color:      isPositive ? "#56d364"  : isNegative ? "#ff7b72"  : "#8b949e",
                border: `1px solid ${isPositive ? "#1a4a2a" : isNegative ? "#4a1a1a" : "#30363d"}`,
              }}
            >
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {isNeutral  && <Minus className="w-3 h-3" />}
              {isPositive ? "+" : ""}{change}%
            </span>
            <span className="font-mono" style={{ fontSize: "10px", color: "#484f58" }}>{changePeriod}</span>
          </div>
        )}

        {subtitle && !change && (
          <p className="font-mono mt-1.5" style={{ fontSize: "10px", color: "#484f58" }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
