"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from "recharts";
import { Users, Globe, Eye, Clock, TrendingUp, MapPin, Smartphone, Monitor, Tablet } from "lucide-react";
import { formatNumber, formatDuration, formatPercent } from "@/lib/utils";
import type { TrafficOverview, ChannelData, TopPage, DeviceData, GeoData, DailyTraffic, DateRange } from "@/types/analytics";

const CHANNEL_COLORS = ["#00ff88", "#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#6b7280"];
const DEVICE_COLORS = ["#00ff88", "#3b82f6", "#a855f7"];

function ChannelRow({ label, value, max, color, total, conversions }: { label: string; value: number; max: number; color: string; total: number; conversions: number }) {
  const widthPct = max > 0 ? (value / max) * 100 : 0;
  const sharePct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  const convRate = value > 0 ? ((conversions / value) * 100).toFixed(1) : "0.0";
  return (
    <div className="space-y-1.5 py-2 border-b border-[#1e2d3d] last:border-0">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[#8b949e] font-medium truncate max-w-[160px]">{label}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[#6e7681]">{sharePct}%</span>
          {conversions > 0 && (
            <span className="text-xs font-medium text-[#00ff88] tabular-nums" title={`${formatNumber(conversions)} conversions`}>{convRate}% cvr</span>
          )}
          <span className="font-semibold text-[#c9d1d9] tabular-nums w-16 text-right">{formatNumber(value)}</span>
        </div>
      </div>
      <div className="h-2 bg-[#161b22] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${widthPct}%`, background: color }} />
      </div>
    </div>
  );
}

function TopPageRow({ rank, path, title, sessions, pageviews, max }: { rank: number; path: string; title: string; sessions: number; pageviews: number; max: number }) {
  const pct = max > 0 ? (sessions / max) * 100 : 0;
  return (
    <div className="py-2.5 border-b border-[#1e2d3d] last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-bold text-[#30363d] w-5 shrink-0 text-right">{rank}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#c9d1d9] font-medium truncate" title={path}>{path === "/" ? "Home" : path}</p>
          {title && <p className="text-xs text-[#6e7681] truncate">{title}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-[#8b949e] tabular-nums">{formatNumber(sessions)}</p>
          <p className="text-xs text-[#6e7681]">{formatNumber(pageviews)} pvs</p>
        </div>
      </div>
      <div className="ml-7 h-1.5 bg-[#161b22] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "#00ff88" }} />
      </div>
    </div>
  );
}

function GeoRow({ rank, city, country, sessions, max }: { rank: number; city: string; country: string; sessions: number; max: number }) {
  const pct = max > 0 ? (sessions / max) * 100 : 0;
  return (
    <div className="py-2.5 border-b border-[#1e2d3d] last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-bold text-[#30363d] w-5 shrink-0 text-right">{rank}</span>
        <MapPin className="w-3.5 h-3.5 text-[#30363d] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#c9d1d9] font-medium truncate">{city || "Unknown"}</p>
          <p className="text-xs text-[#6e7681]">{country}</p>
        </div>
        <span className="text-sm font-semibold text-[#8b949e] tabular-nums shrink-0">{formatNumber(sessions)}</span>
      </div>
      <div className="ml-7 h-1.5 bg-[#161b22] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "#6366f1" }} />
      </div>
    </div>
  );
}

export default function TrafficPage() {
  const [range, setRange] = useState<DateRange>("28d");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<TrafficOverview | null>(null);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [pages, setPages] = useState<TopPage[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [geo, setGeo] = useState<GeoData[]>([]);
  const [daily, setDaily] = useState<DailyTraffic[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch(`/api/analytics?type=all&range=${range}&limit=20`).then((r) => r.json());
      setOverview(d.overview); setChannels(d.channels); setPages(d.pages); setDevices(d.devices); setGeo(d.geo); setDaily(d.daily);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const dailyForChart = daily.map((d) => ({ ...d, date: d.date.slice(5) }));
  const maxChannel = Math.max(...channels.map((c) => c.sessions), 1);
  const totalChannelSessions = channels.reduce((s, c) => s + c.sessions, 0);
  const maxPage = Math.max(...pages.map((p) => p.sessions), 1);
  const maxGeo = Math.max(...geo.map((g) => g.sessions), 1);

  const devicePieData = devices.map((d) => ({ name: d.device.charAt(0) + d.device.slice(1).toLowerCase(), value: d.sessions }));

  const topPagesBarData = pages.slice(0, 8).map((p) => ({
    name: p.pagePath === "/" ? "Home" : p.pagePath.length > 22 ? p.pagePath.slice(0, 22) + "…" : p.pagePath,
    sessions: p.sessions,
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Traffic Analytics" subtitle="Google Analytics 4 — detailed traffic breakdown" dateRange={range} onDateRangeChange={setRange} onRefresh={fetchAll} loading={loading} />

      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Sessions" value={overview?.sessions ?? 0} change={overview?.sessionsChange} icon={Globe} iconColor="text-blue-500" />
          <StatCard title="Users" value={overview?.users ?? 0} change={overview?.usersChange} icon={Users} iconColor="text-purple-500" />
          <StatCard title="Pageviews" value={overview?.pageviews ?? 0} change={overview?.pageviewsChange} icon={Eye} iconColor="text-brand-500" />
          <StatCard title="New Users" value={overview?.newUsers ?? 0} icon={TrendingUp} iconColor="text-green-500" subtitle={`${overview ? formatPercent((overview.newUsers / overview.users) * 100) : "—"} of total`} />
          <StatCard title="Avg. Session" value={overview ? formatDuration(overview.avgSessionDuration) : "—"} icon={Clock} iconColor="text-orange-500" subtitle="Average time on site" />
          <StatCard title="Bounce Rate" value={overview ? formatPercent(overview.bounceRate * 100) : "—"} icon={TrendingUp} iconColor="text-red-400" subtitle="Single page sessions" />
        </div>

        {/* Traffic over time */}
        <Card title="Traffic Over Time" subtitle="Daily sessions and users">
          {loading ? <div className="h-72 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
            <LineChart data={dailyForChart} xKey="date" lines={[{ key: "sessions", color: "#00ff88", label: "Sessions" }, { key: "users", color: "#6366f1", label: "Users" }]} height={300} formatY={(v) => formatNumber(v)} />
          )}
        </Card>

        {/* Channels + Devices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel breakdown */}
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-[#c9d1d9] text-sm">Traffic by Channel</h3>
              <p className="text-xs text-[#6e7681] mt-0.5">Sessions per acquisition channel</p>
            </div>
            {loading ? <div className="h-64 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
              <div className="space-y-0">
                {channels.slice(0, 7).map((c, i) => (
                  <ChannelRow key={i} label={c.channel} value={c.sessions} max={maxChannel} color={CHANNEL_COLORS[i] ?? "#9ca3af"} total={totalChannelSessions} conversions={c.conversions} />
                ))}
              </div>
            )}
          </div>

          {/* Device breakdown */}
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
            <div className="mb-2">
              <h3 className="font-semibold text-[#c9d1d9] text-sm">Device Breakdown</h3>
              <p className="text-xs text-[#6e7681] mt-0.5">Mobile vs Desktop vs Tablet</p>
            </div>
            {loading ? <div className="h-64 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={devicePieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                      {devicePieData.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i] ?? "#9ca3af"} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => [formatNumber(v as number), ""]} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {devices.map((d, i) => {
                    const Icon = d.device === "mobile" || d.device === "MOBILE" ? Smartphone : d.device === "desktop" || d.device === "DESKTOP" ? Monitor : Tablet;
                    return (
                      <div key={d.device} className="text-center p-2 rounded-xl" style={{ background: DEVICE_COLORS[i] + "10" }}>
                        <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: DEVICE_COLORS[i] }} />
                        <p className="text-lg font-bold text-[#e6edf3]">{d.percentage}%</p>
                        <p className="text-xs text-[#6e7681] capitalize">{d.device.toLowerCase()}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top pages bar chart */}
        {!loading && topPagesBarData.length > 0 && (
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
            <h3 className="font-semibold text-[#c9d1d9] text-sm mb-1">Top Pages by Sessions</h3>
            <p className="text-xs text-[#6e7681] mb-4">Most visited pages this period</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topPagesBarData} layout="vertical" margin={{ left: 0, right: 60 }} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: unknown) => [formatNumber(v as number), "Sessions"]} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Bar dataKey="sessions" fill="#00ff88" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="sessions" position="right" style={{ fontSize: 10, fill: "#9ca3af" }} formatter={(v: unknown) => formatNumber(v as number)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Full tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#21262d]">
              <h3 className="font-semibold text-[#c9d1d9] text-sm">All Top Pages</h3>
              <p className="text-xs text-[#6e7681] mt-0.5">Sessions &amp; pageviews</p>
            </div>
            <div className="px-4 py-2 divide-y divide-[#1e2d3d] max-h-[480px] overflow-y-auto">
              {loading ? <div className="h-48 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
                pages.slice(0, 15).map((p, i) => (
                  <TopPageRow key={i} rank={i+1} path={p.pagePath} title={p.pageTitle} sessions={p.sessions} pageviews={p.pageviews} max={maxPage} />
                ))
              )}
            </div>
          </div>

          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#21262d]">
              <h3 className="font-semibold text-[#c9d1d9] text-sm">Top Locations</h3>
              <p className="text-xs text-[#6e7681] mt-0.5">Sessions by city</p>
            </div>
            <div className="px-4 py-2 divide-y divide-[#1e2d3d] max-h-[480px] overflow-y-auto">
              {loading ? <div className="h-48 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
                geo.slice(0, 15).map((g, i) => (
                  <GeoRow key={i} rank={i+1} city={g.city} country={g.country} sessions={g.sessions} max={maxGeo} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
