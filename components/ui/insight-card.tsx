"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, AlertTriangle, CheckCircle2, Info, Zap } from "lucide-react";

type InsightVariant = "success" | "warning" | "info" | "action";

interface InsightCardProps {
  title: string;
  description: string;
  variant?: InsightVariant;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  className?: string;
}

const variantStyles: Record<InsightVariant, { bg: string; border: string; fg: string; defaultIcon: LucideIcon }> = {
  success: { bg: "#0a1a12", border: "#1a4a2a", fg: "#56d364", defaultIcon: CheckCircle2 },
  warning: { bg: "#1a1400", border: "#3a2e00", fg: "#e3b341", defaultIcon: AlertTriangle },
  info:    { bg: "#0a1420", border: "#1a3050", fg: "#79c0ff", defaultIcon: Info },
  action:  { bg: "#0a1a12", border: "#1a3a2a", fg: "#00ff88", defaultIcon: Zap },
};

export function InsightCard({ title, description, variant = "info", icon, action, className }: InsightCardProps) {
  const styles = variantStyles[variant];
  const IconComponent = icon ?? styles.defaultIcon;

  return (
    <div
      className={cn("rounded-lg p-4 flex gap-3", className)}
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
    >
      <div className="mt-0.5 shrink-0" style={{ color: styles.fg }}>
        <IconComponent className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#e6edf3" }}>{title}</p>
        <p className="font-mono mt-0.5 leading-relaxed" style={{ fontSize: "11px", color: "#8b949e" }}>{description}</p>
        {action && (
          <a
            href={action.href}
            className="inline-block mt-2 font-mono font-semibold hover:underline"
            style={{ fontSize: "11px", color: styles.fg }}
          >
            {action.label} →
          </a>
        )}
      </div>
    </div>
  );
}

export function InsightGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {children}
    </div>
  );
}
