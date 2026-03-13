"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from "recharts";
import { Lightbulb, TrendingUp, MousePointerClick, Search, ExternalLink, FileEdit, Target, Zap, ArrowUp, Kanban, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import type { SEOOpportunity, DateRange } from "@/types/analytics";

const BRAND = "#00ff88";

const typeConfig = {
  "quick-win": { label: "Quick Win", color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", textColor: "#16a34a", icon: "🎯", description: "High traffic kick waiting for a ranking boost" },
  "ctr-improvement": { label: "CTR Fix", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", textColor: "#1d4ed8", icon: "✏️", description: "Many impressions, low click-through rate" },
  "position-boost": { label: "Position Boost", color: "#a855f7", bg: "#faf5ff", border: "#e9d5ff", textColor: "#7e22ce", icon: "🚀", description: "Just off page 1 — push it over" },
};

function KpiBadge({ label, count, sub, color, icon: Icon }: { label: string; count: number; sub: string; color: string; icon: React.ElementType }) {
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "15" }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-xs font-semibold text-[#484f58] uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-3xl font-black text-[#e6edf3]">{formatNumber(count)}</p>
      <p className="text-xs text-[#6e7681] mt-1">{sub}</p>
    </div>
  );
}

function PositionProgress({ position }: { position: number }) {
  // Shows how close to page 1 (top 10) — positions 1-10 = full, 11-20 = half, etc.
  const target = 10;
  const pct = position <= target ? 100 : Math.max(5, Math.round((target / position) * 100));
  const color = position <= 3 ? "#22c55e" : position <= 10 ? "#3b82f6" : position <= 20 ? "#f59e0b" : BRAND;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#6e7681]">Position #{formatPosition(position)}</span>
        <span className="font-semibold" style={{ color }}>{position <= 10 ? "Page 1 ✓" : `${10 - position <= -50 ? "50+" : Math.abs(10 - Math.round(position))} from page 1`}</span>
      </div>
      <div className="h-1.5 bg-[#161b22] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const TRELLO_STORAGE_KEY = "cawarden_trello_pushed";

type TrelloEntry = { cardUrl: string; action: "created" | "updated"; pushedAt: string };

function getTrelloCache(): Record<string, TrelloEntry> {
  try { return JSON.parse(localStorage.getItem(TRELLO_STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

function saveTrelloCache(query: string, entry: TrelloEntry) {
  try {
    const cache = getTrelloCache();
    cache[query] = entry;
    localStorage.setItem(TRELLO_STORAGE_KEY, JSON.stringify(cache));
  } catch { /* storage full / SSR */ }
}

type TrelloState = "idle" | "loading" | "done" | "error";

function OpportunityCard({ op, index }: { op: SEOOpportunity; index: number }) {
  const config = typeConfig[op.opportunityType];
  const pagePath = op.page ? op.page.replace("https://cawardenreclaim.co.uk", "") : null;
  const [trelloState, setTrelloState] = useState<TrelloState>("idle");
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [trelloAction, setTrelloAction] = useState<"created" | "updated" | null>(null);
  const [pushedAt, setPushedAt] = useState<string | null>(null);

  // Restore persisted state on mount
  useEffect(() => {
    const cached = getTrelloCache()[op.query];
    if (cached) {
      setCardUrl(cached.cardUrl);
      setTrelloAction(cached.action);
      setPushedAt(cached.pushedAt);
      setTrelloState("done");
    }
  }, [op.query]);

  const pushToTrello = async () => {
    setTrelloState("loading");
    try {
      const res = await fetch("/api/trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(op),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      const now = new Date().toISOString();
      setCardUrl(data.cardUrl);
      setTrelloAction(data.action);
      setPushedAt(now);
      setTrelloState("done");
      saveTrelloCache(op.query, { cardUrl: data.cardUrl, action: data.action, pushedAt: now });
    } catch (e) {
      console.error("[Trello push]", e);
      setTrelloState("error");
    }
  };

  return (
    <div className="bg-[#161b22] border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all" style={{ borderColor: config.border }}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl shrink-0 mt-0.5">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#e6edf3]">{op.query}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ background: config.bg, color: config.textColor }}>{config.label}</span>
          </div>
          <p className="text-xs text-[#484f58] mt-1.5 leading-relaxed">{op.recommendation}</p>
        </div>
      </div>

      <PositionProgress position={op.position} />

      {/* Position change delta */}
      {op.positionChange !== null && op.positionChange !== 0 && (
        <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${op.positionChange > 0 ? "text-[#00ff88]" : "text-[#ff7b72]"}`}>
          <span>{op.positionChange > 0 ? "▲" : "▼"}</span>
          <span>{Math.abs(op.positionChange)} positions {op.positionChange > 0 ? "gained" : "lost"} vs previous period</span>
        </div>
      )}
      {op.positionChange === null && (
        <p className="mt-2 text-xs text-[#484f58]">No previous period data</p>
      )}

      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#21262d]">
        <div className="flex items-center gap-1 text-xs text-[#6e7681]">
          <Search className="w-3 h-3" />
          {formatNumber(op.impressions)} impr.
        </div>
        <div className="flex items-center gap-1 text-xs text-[#6e7681]">
          <MousePointerClick className="w-3 h-3" />
          {formatPercent(op.ctr)} CTR
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold ml-auto" style={{ color: BRAND }}>
          <ArrowUp className="w-3 h-3" />
          +{formatNumber(op.potentialClicks)} potential clicks
        </div>
      </div>

      {op.page && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <a href={op.page} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline px-2.5 py-1.5 rounded-lg" style={{ background: BRAND + "12", color: BRAND }}>
            <ExternalLink className="w-3 h-3 shrink-0" />
            {pagePath && pagePath.length > 1 ? pagePath : "Home page"}
          </a>
          <span className="inline-flex items-center gap-1 text-xs text-[#6e7681]">
            <FileEdit className="w-3 h-3 shrink-0" />
            Update title &amp; meta description
          </span>
        </div>
      )}

      {/* Trello push */}
      <div className="mt-3 pt-3 border-t border-[#21262d] flex items-center">
        {trelloState === "idle" && (
          <button
            onClick={pushToTrello}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border transition-all hover:brightness-110"
            style={{ background: "#0a1020", borderColor: "#1d6fa440", color: "#79c0ff" }}
          >
            <Kanban className="w-3 h-3" />
            Push to Trello
          </button>
        )}
        {trelloState === "loading" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#484f58]">
            <Loader2 className="w-3 h-3 animate-spin" />
            Pushing...
          </span>
        )}
        {trelloState === "done" && cardUrl && (
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={cardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border transition-all hover:brightness-110"
              style={{ background: "#0a1a12", borderColor: "#00ff8840", color: "#00ff88" }}
            >
              <CheckCircle2 className="w-3 h-3" />
              {trelloAction === "updated" ? "Updated" : "In Trello"} ↗
            </a>
            {pushedAt && (
              <span className="text-[10px] font-mono text-[#484f58]">
                {new Date(pushedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            )}
            <button
              onClick={pushToTrello}
              className="text-[10px] font-mono text-[#484f58] hover:text-[#79c0ff] transition-colors ml-auto"
              title="Re-push to update the Trello card"
            >
              re-push
            </button>
          </div>
        )}
        {trelloState === "error" && (
          <button
            onClick={pushToTrello}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border transition-all hover:brightness-110"
            style={{ background: "#1a0a0a", borderColor: "#ff7b7240", color: "#ff7b72" }}
          >
            <AlertTriangle className="w-3 h-3" />
            Failed — retry
          </button>
        )}
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const [range, setRange] = useState<DateRange>("28d");
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<SEOOpportunity[]>([]);
  const [filter, setFilter] = useState<SEOOpportunity["opportunityType"] | "all">("all");
  const [visibleCount, setVisibleCount] = useState(20);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search-console?type=opportunities&range=${range}`);
      setOpportunities(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === "all" ? opportunities : opportunities.filter((o) => o.opportunityType === filter);
  const visible = filtered.slice(0, visibleCount);
  const totalPotential = opportunities.reduce((sum, o) => sum + o.potentialClicks, 0);

  const counts = {
    all: opportunities.length,
    "quick-win": opportunities.filter((o) => o.opportunityType === "quick-win").length,
    "ctr-improvement": opportunities.filter((o) => o.opportunityType === "ctr-improvement").length,
    "position-boost": opportunities.filter((o) => o.opportunityType === "position-boost").length,
  };

  const chartData = filtered.slice(0, 10).map((o) => ({
    query: o.query.length > 28 ? o.query.slice(0, 28) + "…" : o.query,
    potentialClicks: o.potentialClicks,
    currentClicks: o.clicks,
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="SEO Opportunities" subtitle="Data-driven actions to grow organic traffic for Cawarden Reclaim" dateRange={range} onDateRangeChange={setRange} onRefresh={fetchData} loading={loading} />

      <div className="p-6 space-y-6">
        {/* KPI summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-[#161b22] rounded-2xl animate-pulse" />) : (
            <>
              <KpiBadge label="Total Opportunities" count={counts.all} sub={`~+${formatNumber(totalPotential)} potential extra clicks`} color={BRAND} icon={Lightbulb} />
              <KpiBadge label="Quick Wins" count={counts["quick-win"]} sub="High impact, quick to act on" color="#22c55e" icon={Zap} />
              <KpiBadge label="CTR Fixes" count={counts["ctr-improvement"]} sub="Rewrite title &amp; meta tags" color="#3b82f6" icon={FileEdit} />
              <KpiBadge label="Position Boosts" count={counts["position-boost"]} sub="Just off page 1 — push over" color="#a855f7" icon={Target} />
            </>
          )}
        </div>

        {/* Summary banner */}
        <div className="bg-gradient-to-r from-brand-500 to-orange-600 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-6 h-6 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-lg">{filtered.length} opportunities identified</h3>
              <p className="text-orange-100 text-sm mt-1">
                Acting on these could bring an estimated{" "}
                <span className="font-bold text-white">+{formatNumber(filtered.reduce((s, o) => s + o.potentialClicks, 0))} additional clicks</span>{" "}
                per period from organic search alone.
              </p>
            </div>
          </div>
        </div>

        {/* Potential clicks chart */}
        {!loading && chartData.length > 0 && (
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
            <h3 className="font-semibold text-[#c9d1d9] text-sm mb-1">Potential Clicks by Keyword</h3>
            <p className="text-xs text-[#6e7681] mb-4">Top 10 opportunities sorted by estimated additional clicks</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 70 }} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                <YAxis type="category" dataKey="query" width={170} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-lg px-3 py-2.5 text-xs space-y-1">
                        <p className="font-semibold text-[#8b949e] max-w-[200px]">{d?.query}</p>
                        <p>Potential: <span className="font-bold text-orange-600">+{formatNumber(d?.potentialClicks)}</span></p>
                        <p>Current: <span className="font-bold">{formatNumber(d?.currentClicks)}</span></p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="potentialClicks" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={i === 0 ? BRAND : i < 3 ? "#f97316" : "#fbbf24"} />)}
                  <LabelList dataKey="potentialClicks" position="right" style={{ fontSize: 10, fill: "#9ca3af" }} formatter={(v: unknown) => `+${formatNumber(v as number)}`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "quick-win", "ctr-improvement", "position-boost"] as const).map((f) => {
            const cfg = f !== "all" ? typeConfig[f] : null;
            return (
              <button key={f} onClick={() => { setFilter(f); setVisibleCount(20); }}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all"
                style={filter === f ? { background: cfg?.color ?? "#111827", color: "white", borderColor: "transparent" } : { background: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
                {f === "all" ? "All" : cfg?.label} ({counts[f]})
              </button>
            );
          })}
        </div>

        {!loading && filtered.length > 0 && (
          <p className="text-xs text-[#6e7681]">Showing <span className="font-semibold text-[#8b949e]">{Math.min(visibleCount, filtered.length)}</span> of <span className="font-semibold text-[#8b949e]">{filtered.length}</span> opportunities</p>
        )}

        {/* Opportunity cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 bg-[#161b22] rounded-2xl animate-pulse" />) : filtered.length === 0 ? (
            <p className="text-sm text-[#6e7681] col-span-2 text-center py-12">No opportunities found for this filter and date range.</p>
          ) : (
            visible.map((op, i) => <OpportunityCard key={i} op={op} index={i} />)
          )}
        </div>

        {!loading && visibleCount < filtered.length && (
          <div className="flex justify-center">
            <button onClick={() => setVisibleCount((c) => c + 20)}
              className="px-5 py-2.5 rounded-xl border border-dashed text-sm font-medium transition-all hover:shadow-sm"
              style={{ color: BRAND, borderColor: BRAND + "60" }}>
              Load 20 more ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}

        {/* Tips */}
        <Card title="💡 Cawarden-Specific SEO Tips" subtitle="Based on your business type and product range">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Brick Matching Pages", body: "Create individual landing pages for the top 20 most-searched brick types (e.g. 'Accrington Red reclaimed brick'). Each page = a new keyword ranking opportunity." },
              { title: "Location + Product Pages", body: "Target phrases like 'reclaimed bricks Staffordshire', 'roof tiles Birmingham delivery'. These have lower competition than national terms." },
              { title: "Seasonal Content", body: "Construction peaks in spring/summer. Publish guides in Feb–March targeting 'how to match reclaimed bricks' and 'period property renovation materials'." },
              { title: "Schema Markup for Products", body: "Add Product schema to brick/tile pages including price, availability (stock count), and reviews. This can generate rich results in Google and improve CTR." },
              { title: "Blog Content Clusters", body: "Cluster articles around core topics: reclaimed bricks, period property renovation, sustainable building. Internal links between related posts improve rankings across the cluster." },
              { title: "Image SEO", body: "Reclaim buyers often search via Google Images. Ensure all product images have descriptive filenames and alt text (e.g. 'victorian-blue-engineering-brick.jpg')." },
            ].map((tip, i) => (
              <div key={i} className="p-4 bg-[#1a1200] border border-amber-100 rounded-xl">
                <p className="text-sm font-semibold text-amber-900">{tip.title}</p>
                <p className="text-xs text-[#e3b341] mt-1 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
