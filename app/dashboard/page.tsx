"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { StatCardSkeleton, ChartSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";
import { InsightCard, InsightGrid } from "@/components/ui/insight-card";
import { LineChart } from "@/components/charts/line-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip,
} from "recharts";
import {
  Users,
  Globe,
  Eye,
  MousePointerClick,
  Search,
  TrendingUp,
  Zap,
  Target,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import type { DashboardSummary, DateRange } from "@/types/analytics";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-bold text-[#6e7681] uppercase tracking-widest whitespace-nowrap">
        {children}
      </h2>
      <div className="flex-1 h-px bg-[#161b22]" />
    </div>
  );
}

function ChannelBar({ label, value, max, color, conversionRate }: { label: string; value: number; max: number; color: string; conversionRate?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[#8b949e] font-medium truncate max-w-[140px]">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {conversionRate !== undefined && conversionRate > 0 && (
            <span className="text-[#00c060] font-medium tabular-nums">{conversionRate.toFixed(1)}%</span>
          )}
          <span className="text-[#484f58] font-semibold tabular-nums">{formatNumber(value)}</span>
        </div>
      </div>
      <div className="h-2 bg-[#161b22] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

const CHANNEL_COLORS = ["#00ff88", "#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#6b7280"];

export default function OverviewPage() {
  const [range, setRange] = useState<DateRange>("28d");
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?range=${range}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mergedDaily = data?.dailyTraffic.map((g) => {
    const gsc = data.dailyGSC.find((s) => s.date === g.date);
    return { date: g.date.slice(5), sessions: g.sessions, clicks: gsc?.clicks ?? 0 };
  }) ?? [];

  // Dynamic insights
  const insights = data ? (() => {
    const result = [];
    if (data.gsc.avgPosition <= 10) {
      result.push({ variant: "success" as const, title: "Strong Search Visibility", description: `Average ranking position is #${formatPosition(data.gsc.avgPosition)} — you're appearing on the first page of Google for most tracked queries.` });
    } else if (data.gsc.avgPosition <= 20) {
      result.push({ variant: "warning" as const, title: "Position 2 Opportunity", description: `Average position #${formatPosition(data.gsc.avgPosition)} — many keywords are close to page one. Targeted content improvements could unlock significant traffic.`, action: { label: "See opportunities", href: "/dashboard/opportunities" } });
    }
    if (data.gsc.avgCtr < 3) {
      result.push({ variant: "action" as const, title: "Low CTR — Meta Tags Need Work", description: `${formatPercent(data.gsc.avgCtr)} CTR suggests title tags and meta descriptions aren't compelling search users to click. Review your top-impression pages.`, action: { label: "View SEO performance", href: "/dashboard/seo" } });
    }
    if (data.ga.sessionsChange && data.ga.sessionsChange > 10) {
      result.push({ variant: "success" as const, title: "Traffic Growing", description: `Sessions are up ${data.ga.sessionsChange}% compared to the previous period — the site is gaining momentum.` });
    } else if (data.ga.sessionsChange && data.ga.sessionsChange < -10) {
      result.push({ variant: "warning" as const, title: "Traffic Declining", description: `Sessions dropped ${Math.abs(data.ga.sessionsChange)}% vs the previous period. Check for ranking losses in Search Console.`, action: { label: "View SEO", href: "/dashboard/seo" } });
    }
    if (data.opportunities.length > 0) {
      result.push({ variant: "action" as const, title: `${data.opportunities.length} SEO Quick Wins Found`, description: `Keywords with high impressions but low clicks — small changes to these pages could drive meaningful organic traffic uplift.`, action: { label: "View all opportunities", href: "/dashboard/opportunities" } });
    }
    return result.slice(0, 3);
  })() : [];

  const maxChannelSessions = data ? Math.max(...(data.channelBreakdown ?? []).map((c) => c.sessions)) : 1;

  const trafficAnomalies = (() => {
    const daily = data?.dailyTraffic ?? [];
    if (daily.length < 2) return [];
    const results: { date: string; sessions: number; prevSessions: number; drop: number }[] = [];
    for (let i = 1; i < daily.length; i++) {
      const prev = daily[i - 1];
      const curr = daily[i];
      if (prev.sessions < 50) continue; // ignore near-zero baseline days
      const change = ((curr.sessions - prev.sessions) / prev.sessions) * 100;
      if (change < -30) {
        results.push({ date: curr.date, sessions: curr.sessions, prevSessions: prev.sessions, drop: Math.round(Math.abs(change)) });
      }
    }
    return results;
  })();

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Dashboard Overview"
        subtitle="Google Analytics 4 · Search Console · Cawarden Reclaim"
        dateRange={range}
        onDateRangeChange={setRange}
        onRefresh={fetchData}
        loading={loading}
      />

      <div className="p-6 space-y-8 flex-1">
        {error && (
          <div className="bg-[#1e0a0a] border border-red-200 rounded-2xl p-4 text-sm text-[#ff7b72]">
            <strong>Error loading data:</strong> {error}
            <p className="mt-1 text-xs text-red-500">Make sure your .env.local credentials are correct and service account access has been granted.</p>
          </div>
        )}

        {/* Anomaly Alert */}
        {!loading && trafficAnomalies.length > 0 && (
          <div className="fade-in-up bg-amber-950/40 border border-amber-700/50 rounded-2xl p-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-400">Traffic Anomaly Detected</p>
              {trafficAnomalies.length === 1 ? (
                <p className="text-xs text-amber-300/70 mt-1">
                  Sessions dropped <strong className="text-amber-300">{trafficAnomalies[0].drop}%</strong> overnight on{" "}
                  <strong className="text-amber-300">{trafficAnomalies[0].date}</strong> ({formatNumber(trafficAnomalies[0].prevSessions)} → {formatNumber(trafficAnomalies[0].sessions)} sessions).{" "}
                  Check rankings and crawl health.
                </p>
              ) : (
                <p className="text-xs text-amber-300/70 mt-1">
                  <strong className="text-amber-300">{trafficAnomalies.length} day-over-day drops &gt;30%</strong> detected this period — worst:{" "}
                  <strong className="text-amber-300">{trafficAnomalies[0].drop}%</strong> on {trafficAnomalies[0].date}. Check rankings and crawl health.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Insights */}
        {!loading && insights.length > 0 && (
          <div className="fade-in-up">
            <SectionLabel>Insights</SectionLabel>
            <InsightGrid>
              {insights.map((ins, i) => (
                <InsightCard key={i} {...ins} />
              ))}
            </InsightGrid>
          </div>
        )}

        {/* GA4 Stats */}
        <div className="fade-in-up fade-in-up-delay-1">
          <SectionLabel>Website Traffic · Google Analytics 4</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
              <>
                <StatCard title="Sessions" value={data?.ga.sessions ?? 0} change={data?.ga.sessionsChange} icon={Globe} iconColor="text-blue-500" />
                <StatCard title="Users" value={data?.ga.users ?? 0} change={data?.ga.usersChange} icon={Users} iconColor="text-purple-500" />
                <StatCard title="Page Views" value={data?.ga.pageviews ?? 0} change={data?.ga.pageviewsChange} icon={Eye} iconColor="text-brand-500" />
                <StatCard title="New Users" value={data?.ga.newUsers ?? 0} icon={TrendingUp} iconColor="text-green-500" subtitle={`${data ? formatPercent((data.ga.newUsers / data.ga.users) * 100) : "—"} of total users`} />
              </>
            )}
          </div>
        </div>

        {/* GSC Stats */}
        <div className="fade-in-up fade-in-up-delay-2">
          <SectionLabel>Organic Search · Google Search Console</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
              <>
                <StatCard title="Organic Clicks" value={data?.gsc.totalClicks ?? 0} change={data?.gsc.clicksChange} icon={MousePointerClick} iconColor="text-orange-500" />
                <StatCard title="Impressions" value={data?.gsc.totalImpressions ?? 0} change={data?.gsc.impressionsChange} icon={Search} iconColor="text-indigo-500" />
                <StatCard title="Avg. CTR" value={data ? `${formatPercent(data.gsc.avgCtr)}` : "—"} icon={Zap} iconColor="text-yellow-500" subtitle="Click-through rate from search" />
                <StatCard title="Avg. Position" value={data ? `#${formatPosition(data.gsc.avgPosition)}` : "—"} icon={Target} iconColor="text-teal-500" subtitle="Average ranking position" />
              </>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="fade-in-up fade-in-up-delay-3">
          <SectionLabel>Trends</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Sessions vs Organic Clicks" subtitle="Daily GA4 sessions alongside GSC organic clicks" className="lg:col-span-2" accent="brand">
              {loading ? <ChartSkeleton height="h-64" /> : (
                <LineChart
                  data={mergedDaily}
                  xKey="date"
                  lines={[
                    { key: "sessions", color: "#00ff88", label: "Sessions (GA4)" },
                    { key: "clicks", color: "#6366f1", label: "Organic Clicks (GSC)" },
                  ]}
                />
              )}
            </Card>

            <Card title="Traffic Channels" subtitle="Sessions by acquisition source" accent="indigo">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between">
                        <div className="h-3 w-24 bg-[#161b22] rounded animate-pulse" />
                        <div className="h-3 w-12 bg-[#161b22] rounded animate-pulse" />
                      </div>
                      <div className="h-1.5 bg-[#161b22] rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {(data?.channelBreakdown ?? []).length > 0 && (
                    <div className="mb-4">
                      <ResponsiveContainer width="100%" height={120}>
                        <RePieChart>
                          <Pie data={(data?.channelBreakdown ?? []).slice(0, 7).map((c) => ({ name: c.channel, value: c.sessions }))} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                            {(data?.channelBreakdown ?? []).slice(0, 7).map((_, i) => (
                              <Cell key={i} fill={CHANNEL_COLORS[i] ?? "#9ca3af"} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: unknown) => [formatNumber(v as number), ""]} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="space-y-3.5">
                    {(data?.channelBreakdown ?? []).slice(0, 7).map((c, i) => (
                      <ChannelBar key={i} label={c.channel} value={c.sessions} max={maxChannelSessions} color={CHANNEL_COLORS[i] ?? "#9ca3af"} conversionRate={c.sessions > 0 ? (c.conversions / c.sessions) * 100 : 0} />
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>

        {/* Tables */}
        <div className="fade-in-up fade-in-up-delay-4">
          <SectionLabel>Top Performers</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Top Search Queries" subtitle="Driving the most organic clicks" accent="orange"
              action={<a href="/dashboard/seo" className="text-xs text-brand-500 hover:underline font-medium">View all →</a>}
            >
              <div className="divide-y divide-[#1e2d3d]">
                {loading
                  ? Array.from({ length: 7 }).map((_, i) => <TableRowSkeleton key={i} cols={3} />)
                  : (data?.topQueries ?? []).slice(0, 8).map((q, i) => (
                    <div key={i} className="py-2.5 border-b border-[#1e2d3d] last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#30363d] w-5 shrink-0 text-right">{i + 1}</span>
                        <span className="text-sm text-[#c9d1d9] truncate flex-1">{q.query}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-[#6e7681]">{formatNumber(q.clicks)}</span>
                          <Badge variant={q.position <= 3 ? "green" : q.position <= 10 ? "blue" : "yellow"}>
                            #{formatPosition(q.position)}
                          </Badge>
                        </div>
                      </div>
                      <div className="ml-8 mt-1 h-1 bg-[#161b22] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(4, (q.clicks / Math.max(...(data?.topQueries ?? []).map((x) => x.clicks), 1)) * 100)}%`, background: q.position <= 3 ? "#22c55e" : q.position <= 10 ? "#3b82f6" : "#00ff88" }} />
                      </div>
                    </div>
                  ))
                }
              </div>
            </Card>

            <Card title="Top Pages by Traffic" subtitle="Pages with the most GA4 sessions" accent="blue"
              action={<a href="/dashboard/traffic" className="text-xs text-brand-500 hover:underline font-medium">View all →</a>}
            >
              <div className="divide-y divide-[#1e2d3d]">
                {loading
                  ? Array.from({ length: 7 }).map((_, i) => <TableRowSkeleton key={i} cols={2} />)
                  : (data?.topPages ?? []).slice(0, 8).map((p, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                      <span className="text-xs font-bold text-[#30363d] w-5 shrink-0 text-right">{i + 1}</span>
                      <span className="text-sm text-[#8b949e] truncate flex-1" title={p.pagePath}>
                        {p.pagePath === "/" ? "Home" : p.pagePath}
                      </span>
                      <span className="text-xs font-medium text-[#484f58] shrink-0 bg-[#0d1117] px-2 py-0.5 rounded-md">
                        {formatNumber(p.sessions)}
                      </span>
                    </div>
                  ))
                }
              </div>
            </Card>
          </div>
        </div>

        {/* Opportunities teaser */}
        {!loading && data && data.opportunities.length > 0 && (
          <div>
            <SectionLabel>SEO Quick Wins</SectionLabel>
            <Card
              title={`${data.opportunities.length} Opportunities Identified`}
              subtitle="Keywords with high impressions but low clicks — easy rankings to capture"
              accent="green"
              action={<a href="/dashboard/opportunities" className="text-xs text-brand-500 hover:underline font-medium">View all →</a>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.opportunities.slice(0, 4).map((o, i) => {
                  const pagePath = o.page ? o.page.replace("https://cawardenreclaim.co.uk", "") : null;
                  return (
                    <div key={i} className="flex gap-3 p-3.5 bg-[#0d1117] rounded-xl hover:bg-[#161b22] transition-colors">
                      <span className="text-base shrink-0 mt-0.5">
                        {o.opportunityType === "quick-win" ? "🎯" : "✏️"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#c9d1d9] truncate">{o.query}</p>
                        <p className="text-xs text-[#484f58] mt-0.5 leading-relaxed">{o.recommendation}</p>
                        {o.page && (
                          <a
                            href={o.page}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-xs text-brand-600 font-medium hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {pagePath && pagePath.length > 1 ? pagePath : "Home page"}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

