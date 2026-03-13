"use client";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "green" | "red" | "yellow" | "blue" | "purple" | "orange";

const variantStyles: Record<BadgeVariant, { background: string; color: string; border: string }> = {
  default: { background: "#21262d", color: "#8b949e",  border: "#30363d" },
  green:   { background: "#0a1a12", color: "#56d364",  border: "#1a4a2a" },
  red:     { background: "#1e0a0a", color: "#ff7b72",  border: "#4a1a1a" },
  yellow:  { background: "#1a1400", color: "#e3b341",  border: "#3a2e00" },
  blue:    { background: "#0a1420", color: "#79c0ff",  border: "#1a3050" },
  purple:  { background: "#160a20", color: "#d2a8ff",  border: "#3a1a50" },
  orange:  { background: "#1a0e00", color: "#ffa657",  border: "#3a2200" },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-semibold", className)}
      style={{ background: s.background, color: s.color, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  );
}
