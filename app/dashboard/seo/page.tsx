"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ReferenceLine, PieChart, Pie, Legend,
} from "recharts";
import { MousePointerClick, Search, TrendingUp, Zap, Smartphone, Monitor, Tablet } from "lucide-react";
import { formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import type { GSCOverview, GSCQuery, GSCPage, GSCDevice, DailyGSC, DateRange } from "@/types/analytics";

const BRAND = "#00ff88";

function positionBadge(pos: number) {
  if (pos <= 3) return <Badge variant="green">#{formatPosition(pos)}</Badge>;
  if (pos <= 10) return <Badge variant="blue">#{formatPosition(pos)}</Badge>;
  if (pos <= 20) return <Badge variant="yellow">#{formatPosition(pos)}</Badge>;
  return <Badge variant="default">#{formatPosition(pos)}</Badge>;
}

function MiniBar({ value, max, color = BRAND }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1 bg-[#161b22] rounded-full overflow-hidden mt-0.5">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function PositionBuckets({ queries }: { queries: GSCQuery[] }) {
  if (queries.length === 0) return null;
  const buckets = [
    { name: "#1–3", min: 1, max: 3, color: "#22c55e" },
    { name: "#4–10", min: 4, max: 10, color: "#3b82f6" },
    { name: "#11–20", min: 11, max: 20, color: "#f59e0b" },
    { name: "#21–50", min: 21, max: 50, color: "#f97316" },
    { name: "#51+", min: 51, max: Infinity, color: "#e5e7eb" },
  ];
  const data = buckets.map(({ name, min, max, color }) => ({
    name, color,
    count: queries.filter((q) => q.position >= min && q.position <= max).length,
  }));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
      <h3 className="font-semibold text-[#c9d1d9] text-sm mb-1">Keyword Position Distribution</h3>
      <p className="text-xs text-[#6e7681] mb-4">{total} keywords tracked</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            cursor={{ fill: "#f9fafb" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const cnt = payload[0]?.value as number;
              return (
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-lg px-3 py-2.5 text-xs">
                  <p className="font-semibold text-[#8b949e]">{label}</p>
                  <p className="mt-1">{cnt} keywords <span className="text-[#6e7681]">({total > 0 ? Math.round((cnt / total) * 100) : 0}%)</span></p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-[#484f58]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span>{d.name}: <strong className="text-[#8b949e]">{d.count}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtrBenchmark({ ctr }: { ctr: number }) {
  const benchmarks = [
    { name: "Poor", max: 1, color: "#ef4444" },
    { name: "Low", max: 2, color: "#f59e0b" },
    { name: "Avg", max: 5, color: "#3b82f6" },
    { name: "Good", max: 10, color: "#22c55e" },
    { name: "Great", max: 100, color: "#10b981" },
  ];
  const zone = benchmarks.find((b) => ctr <= b.max) ?? benchmarks[benchmarks.length - 1];
  const pct = Math.min((ctr / 10) * 100, 100);
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
      <h3 className="font-semibold text-[#c9d1d9] text-sm mb-1">CTR vs Benchmark</h3>
      <p className="text-xs text-[#6e7681] mb-4">Industry average: 2–5%</p>
      <div className="flex items-end gap-3 mb-4">
        <p className="text-4xl font-black" style={{ color: zone.color }}>{formatPercent(ctr)}</p>
        <span className="text-sm font-semibold pb-1" style={{ color: zone.color }}>{zone.name}</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-red-400 via-amber-400 via-blue-400 to-emerald-400">
        <div className="absolute top-0 h-full w-1 bg-[#161b22] shadow-md rounded-full transition-all duration-700" style={{ left: `calc(${pct}% - 2px)` }} />
      </div>
      <div className="flex justify-between text-xs text-[#6e7681] mt-1.5">
        <span>0%</span><span>2%</span><span>5%</span><span>10%</span>
      </div>
    </div>
  );
}

function DeviceCard({ device, clicks, impressions, ctr, position, total }: {
  device: string; clicks: number; impressions: number; ctr: number; position: number; total: number;
}) {
  const pct = total > 0 ? (clicks / total) * 100 : 0;
  const Icon = device === "MOBILE" ? Smartphone : device === "DESKTOP" ? Monitor : Tablet;
  const color = device === "MOBILE" ? "#00ff88" : device === "DESKTOP" ? "#3b82f6" : "#a855f7";
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "15" }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="font-semibold text-[#8b949e] capitalize text-sm">{device.charAt(0) + device.slice(1).toLowerCase()}</p>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#161b22] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><p className="text-xs text-[#6e7681]">Clicks</p><p className="text-lg font-bold text-[#c9d1d9]">{formatNumber(clicks)}</p></div>
        <div><p className="text-xs text-[#6e7681]">Impressions</p><p className="text-lg font-bold text-[#c9d1d9]">{formatNumber(impressions)}</p></div>
        <div><p className="text-xs text-[#6e7681]">CTR</p><p className="text-base font-semibold text-[#8b949e]">{formatPercent(ctr)}</p></div>
        <div><p className="text-xs text-[#6e7681]">Avg. Pos.</p><p className="text-base font-semibold text-[#8b949e]">#{formatPosition(position)}</p></div>
      </div>
    </div>
  );
}

export default function SEOPage() {
  const [range, setRange] = useState<DateRange>("28d");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<GSCOverview | null>(null);
  const [queries, setQueries] = useState<GSCQuery[]>([]);
  const [pages, setPages] = useState<GSCPage[]>([]);
  const [devices, setDevices] = useState<GSCDevice[]>([]);
  const [daily, setDaily] = useState<DailyGSC[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch(`/api/search-console?type=all&range=${range}&limit=25`).then((r) => r.json());
      setOverview(d.overview); setQueries(d.queries); setPages(d.pages); setDevices(d.devices); setDaily(d.daily);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const dailyChart = daily.map((d) => ({ date: d.date.slice(5), clicks: d.clicks, impressions: d.impressions }));
  const maxQueryClicks = Math.max(...queries.map((q) => q.clicks), 1);
  const maxPageClicks = Math.max(...pages.map((p) => p.clicks), 1);
  const totalDeviceClicks = devices.reduce((s, d) => s + d.clicks, 0);

  // Branded vs non-branded split
  const BRAND_TERMS = ["cawarden"];
  const isBranded = (q: string) => BRAND_TERMS.some((t) => q.toLowerCase().includes(t));
  const brandedQueries = queries.filter((q) => isBranded(q.query));
  const nonBrandedQueries = queries.filter((q) => !isBranded(q.query));
  const brandedClicks = brandedQueries.reduce((s, q) => s + q.clicks, 0);
  const nonBrandedClicks = nonBrandedQueries.reduce((s, q) => s + q.clicks, 0);
  const totalClicks = brandedClicks + nonBrandedClicks;
  const brandedPct = totalClicks > 0 ? Math.round((brandedClicks / totalClicks) * 100) : 0;
  const nonBrandedPct = totalClicks > 0 ? 100 - brandedPct : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="SEO Performance" subtitle="Google Search Console — organic search visibility" dateRange={range} onDateRangeChange={setRange} onRefresh={fetchAll} loading={loading} />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Organic Clicks" value={overview?.totalClicks ?? 0} change={overview?.clicksChange} icon={MousePointerClick} iconColor="text-orange-500" />
          <StatCard title="Impressions" value={overview?.totalImpressions ?? 0} change={overview?.impressionsChange} icon={Search} iconColor="text-indigo-500" />
          <StatCard title="Avg. CTR" value={overview ? `${formatPercent(overview.avgCtr)}` : "—"} icon={Zap} iconColor="text-yellow-500" subtitle="Industry avg: 2–5%" />
          <StatCard title="Avg. Position" value={overview ? `#${formatPosition(overview.avgPosition)}` : "—"} icon={TrendingUp} iconColor="text-teal-500" subtitle="Lower is better" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <Card title="Clicks &amp; Impressions Over Time" subtitle="Daily organic search performance">
              {loading ? <div className="h-72 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
                <LineChart data={dailyChart} xKey="date" lines={[{ key: "clicks", color: BRAND, label: "Clicks" }, { key: "impressions", color: "#6366f1", label: "Impressions" }]} height={280} formatY={(v) => formatNumber(v)} />
              )}
            </Card>
          </div>
          <div className="space-y-5">
            {!loading && overview ? <CtrBenchmark ctr={overview.avgCtr} /> : <div className="h-40 bg-[#161b22] rounded-2xl animate-pulse" />}
            {/* Branded vs non-branded split */}
            {!loading && queries.length > 0 && (
              <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
                <h3 className="font-semibold text-[#c9d1d9] text-sm mb-1">Branded vs Non-Branded</h3>
                <p className="text-xs text-[#6e7681] mb-4">Click share by query type</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8b949e]">Branded <span className="text-[#484f58]">(cawarden)</span></span>
                      <span className="font-semibold text-[#c9d1d9]">{brandedPct}% · {formatNumber(brandedClicks)} clicks</span>
                    </div>
                    <div className="h-2 bg-[#0d1117] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 bg-[#6366f1]" style={{ width: `${brandedPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8b949e]">Non-branded</span>
                      <span className="font-semibold text-[#c9d1d9]">{nonBrandedPct}% · {formatNumber(nonBrandedClicks)} clicks</span>
                    </div>
                    <div className="h-2 bg-[#0d1117] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 bg-[#00ff88]" style={{ width: `${nonBrandedPct}%` }} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#484f58] mt-3">
                  {brandedPct > 60
                    ? "Most clicks are branded — growing non-branded is the main SEO lever."
                    : brandedPct < 30
                    ? "Strong non-branded traffic — good organic discoverability."
                    : "Balanced mix of branded and non-branded traffic."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Position distribution */}
        {!loading && queries.length > 0 && <PositionBuckets queries={queries} />}

        {/* Zero-CTR alert — top-5 rankings with high impressions but no clicks */}
        {!loading && (() => {
          const zeroCtr = queries.filter((q) => q.position <= 5 && q.impressions >= 200 && q.clicks === 0);
          if (zeroCtr.length === 0) return null;
          return (
            <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-red-400 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-400">Zero-Click Rankings — Quick Wins</p>
                  <p className="text-xs text-red-300/60">{zeroCtr.length} keyword{zeroCtr.length > 1 ? "s" : ""} ranking top 5 with 200+ impressions but 0 clicks — title/meta tags likely need rewriting</p>
                </div>
              </div>
              <div className="space-y-2">
                {zeroCtr.map((q, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#0d1117] rounded-xl px-3 py-2.5 text-xs">
                    <span className="text-[#c9d1d9] font-medium truncate max-w-[55%]">{q.query}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[#484f58]">#{formatPosition(q.position)}</span>
                      <span className="text-[#6e7681]">{formatNumber(q.impressions)} impr.</span>
                      <span className="font-bold text-red-400">0 clicks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Queries */}
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#21262d]">
              <h3 className="font-semibold text-[#c9d1d9] text-sm">Top Queries</h3>
              <p className="text-xs text-[#6e7681] mt-0.5">Keywords driving the most clicks</p>
            </div>
            {loading ? <div className="h-48 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
              <table className="w-full text-sm">
                <thead className="bg-[#0d1117] border-b border-[#21262d]">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6e7681]">Query</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6e7681]">Clicks</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6e7681]">CTR</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6e7681]">Pos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d3d]">
                  {queries.map((q, i) => (
                    <tr key={i} className="hover:bg-[#0d1117] group">
                      <td className="px-4 py-2.5">
                        <p className="text-[#c9d1d9] font-medium truncate max-w-[200px]" title={q.query}>{q.query}</p>
                        <MiniBar value={q.clicks} max={maxQueryClicks} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[#8b949e] font-semibold">{formatNumber(q.clicks)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[#484f58] text-xs">{formatPercent(q.ctr)}</td>
                      <td className="px-3 py-2.5 text-right">{positionBadge(q.position)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pages */}
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#21262d]">
              <h3 className="font-semibold text-[#c9d1d9] text-sm">Top Pages (Organic)</h3>
              <p className="text-xs text-[#6e7681] mt-0.5">Pages earning the most organic clicks</p>
            </div>
            {loading ? <div className="h-48 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
              <table className="w-full text-sm">
                <thead className="bg-[#0d1117] border-b border-[#21262d]">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6e7681]">Page</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6e7681]">Clicks</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6e7681]">CTR</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6e7681]">Pos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d3d]">
                  {pages.map((p, i) => {
                    const path = p.page.replace("https://cawardenreclaim.co.uk", "") || "/";
                    return (
                      <tr key={i} className="hover:bg-[#0d1117]">
                        <td className="px-4 py-2.5">
                          <p className="text-[#c9d1d9] font-medium truncate max-w-[200px]" title={path}>{path}</p>
                          <MiniBar value={p.clicks} max={maxPageClicks} color="#6366f1" />
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[#8b949e] font-semibold">{formatNumber(p.clicks)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[#484f58] text-xs">{formatPercent(p.ctr)}</td>
                        <td className="px-3 py-2.5 text-right">{positionBadge(p.position)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Device section */}
        {!loading && devices.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-[#6e7681] uppercase tracking-widest mb-4">Search by Device</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {devices.map((d) => (
                <DeviceCard key={d.device} device={d.device} clicks={d.clicks} impressions={d.impressions} ctr={d.ctr} position={d.position} total={totalDeviceClicks} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
