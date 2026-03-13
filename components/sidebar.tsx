"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  Lightbulb,
  Package,
  MapPin,
  ExternalLink,
  BarChart3,
  Globe2,
  FileText,
  ScanSearch,
  Swords,
  Activity,
  GitCompareArrows,
  ScanEye,
  Telescope,
  ListOrdered,
  Cpu,
  Zap,
  ListTodo,
  Gauge,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/dashboard/traffic", label: "Traffic", icon: TrendingUp },
      { href: "/dashboard/products", label: "Products", icon: Package },
      { href: "/dashboard/geo", label: "Geographic", icon: MapPin },
    ],
  },
  {
    label: "SEO",
    items: [
      { href: "/dashboard/seo", label: "SEO Performance", icon: Search },
      { href: "/dashboard/seo/rank-tracker", label: "Rank Tracker", icon: ListOrdered },
      { href: "/dashboard/opportunities", label: "Opportunities", icon: Lightbulb },
      { href: "/dashboard/seo/lighthouse", label: "Page Speed", icon: Gauge },
      { href: "/dashboard/crawl", label: "Site Crawl", icon: ScanSearch },
    ],
  },
  {
    label: "Competitor",
    items: [
      { href: "/dashboard/competitors", label: "Competitors", icon: Swords },
      { href: "/dashboard/competitors/keyword-gap", label: "Keyword Gap", icon: GitCompareArrows },
      { href: "/dashboard/competitors/page-analyser", label: "Page Analyser", icon: ScanEye },
      { href: "/dashboard/competitors/serp-scout", label: "SERP Scout", icon: Telescope },
      { href: "/dashboard/competitors/tech-stack", label: "Tech Stack", icon: Cpu },
      { href: "/dashboard/competitors/live", label: "Live Competitor Intel", icon: Activity },
      { href: "/dashboard/competitors/tracked", label: "Tracked Companies", icon: Globe2 },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/dashboard/report", label: "Generate Report", icon: FileText },
      { href: "/dashboard/tasks", label: "AI Task Queue", icon: ListTodo },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen sticky top-0" style={{ background: "#060a0f", borderRight: "1px solid #1e2d3d" }}>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid #1e2d3d" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 font-mono" style={{ background: "linear-gradient(135deg, #00ff88, #00cc77)", color: "#060a0f" }}>
            CR
          </div>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: "#e6edf3" }}>Cawarden</p>
            <p className="text-xs leading-tight font-mono" style={{ color: "#00ff88", fontSize: "10px" }}>// analytics_hub</p>
          </div>
        </div>
      </div>

      {/* System status bar */}
      <div className="px-5 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #1e2d3d", background: "#0a0e14" }}>
        <Activity className="w-3 h-3" style={{ color: "#00ff88" }} />
        <span className="font-mono text-[10px]" style={{ color: "#00ff88" }}>SYS ONLINE</span>
        <span className="ml-auto w-1.5 h-1.5 rounded-full neon-pulse" style={{ background: "#00ff88" }} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 font-mono" style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#30363d" }}>
              [{group.label}]
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150",
                      active
                        ? "text-[#060a0f]"
                        : "hover:text-[#c9d1d9]"
                    )}
                    style={active
                      ? { background: "#00ff88", color: "#060a0f", boxShadow: "0 0 12px #00ff8844" }
                      : { color: "#8b949e" }
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-mono text-xs tracking-wide">{label}</span>
                    {active && <span className="ml-auto font-mono text-[#060a0f]/70 text-[10px]">▶</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Data sources */}
      <div className="px-4 py-4 space-y-2" style={{ borderTop: "1px solid #1e2d3d" }}>
        <p className="font-mono mb-2" style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#30363d" }}>[data_sources]</p>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 shrink-0" style={{ color: "#79c0ff" }} />
          <span className="font-mono text-[11px]" style={{ color: "#8b949e" }}>google_analytics_4</span>
          <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#00ff88" }} title="Connected" />
        </div>
        <div className="flex items-center gap-2">
          <Globe2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#a5d6ff" }} />
          <span className="font-mono text-[11px]" style={{ color: "#8b949e" }}>search_console</span>
          <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#00ff88" }} title="Connected" />
        </div>
        <a
          href="https://cawardenreclaim.co.uk"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-3 transition-colors font-mono text-[10px]"
          style={{ color: "#484f58" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#8b949e")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#484f58")}
        >
          <ExternalLink className="w-3 h-3" />
          cawardenreclaim.co.uk
        </a>
      </div>
    </aside>
  );
}
