"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  accent?: "brand" | "blue" | "green" | "purple" | "orange" | "indigo" | "red" | "yellow";
  noPadding?: boolean;
}

const accentColors: Record<string, string> = {
  brand:  "#00ff88",
  blue:   "#79c0ff",
  green:  "#56d364",
  purple: "#d2a8ff",
  orange: "#ffa657",
  indigo: "#a5d6ff",
  red:    "#ff7b72",
  yellow: "#e3b341",
};

export function Card({ title, subtitle, children, className, action, accent, noPadding }: CardProps) {
  const accentColor = accent ? accentColors[accent] : null;
  return (
    <div
      className={cn("rounded-lg overflow-hidden", className)}
      style={{
        background: "#161b22",
        border: `1px solid ${accentColor ? accentColor + "44" : "#21262d"}`,
        borderTop: accentColor ? `2px solid ${accentColor}` : undefined,
        boxShadow: accentColor ? `0 0 20px ${accentColor}0a` : undefined,
      }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #21262d" }}>
          <div>
            {title && (
              <h3 className="font-mono text-xs font-semibold tracking-wide uppercase" style={{ color: accentColor ?? "#c9d1d9", letterSpacing: "0.08em" }}>
                {accentColor && <span style={{ color: accentColor, marginRight: 6 }}>▸</span>}
                {title}
              </h3>
            )}
            {subtitle && <p className="font-mono mt-0.5" style={{ fontSize: "10px", color: "#484f58" }}>{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}
