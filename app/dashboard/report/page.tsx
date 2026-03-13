"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import {
  Download,
  Mail,
  CheckCircle2,
  AlertCircle,
  Globe,
  Users,
  Eye,
  TrendingUp,
  MousePointerClick,
  Search,
  Zap,
  Target,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import type { DashboardSummary, DateRange } from "@/types/analytics";

export default function ReportPage() {
  const [range, setRange] = useState<DateRange>("28d");
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");
  const [sendMessage, setSendMessage] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?range=${range}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => window.print();

  const handleSendEmail = async () => {
    setSending(true);
    setSendStatus("idle");
    try {
      const res = await fetch("/api/report/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setSendStatus("success");
      setSendMessage("Report sent successfully!");
    } catch (err: unknown) {
      setSendStatus("error");
      setSendMessage(err instanceof Error ? err.message : "Failed to send report");
    } finally {
      setSending(false);
      setTimeout(() => setSendStatus("idle"), 5000);
    }
  };

  const rangeLabel: Record<string, string> = {
    "7d": "Last 7 Days",
    "28d": "Last 28 Days",
    "90d": "Last 90 Days",
    "180d": "Last 6 Months",
  };

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Analytics Report"
        subtitle="Preview, download or email the report to the site owner"
        dateRange={range}
        onDateRangeChange={setRange}
        onRefresh={fetchData}
        loading={loading}
      />

      {/* Action bar — hidden when printing */}
      <div className="no-print sticky top-[65px] z-10 bg-[#161b22] border-b border-[#21262d] px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
        <p className="text-sm text-[#484f58]">
          Report period: <span className="font-semibold text-[#c9d1d9]">{rangeLabel[range]}</span> · Generated {today}
        </p>
        <div className="flex items-center gap-3">
          {sendStatus !== "idle" && (
            <span className={`flex items-center gap-1.5 text-sm font-medium font-mono ${sendStatus === "success" ? "text-[#56d364]" : "text-[#ff7b72]"}`}>
              {sendStatus === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {sendMessage}
            </span>
          )}
          <button
            onClick={handleSendEmail}
            disabled={sending || loading}
            className="flex items-center gap-2 px-4 py-2 rounded font-mono text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: "#0a1a12", border: "1px solid #1a4a2a", color: "#00ff88" }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {sending ? "Sending…" : "Email Report"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded font-mono text-xs font-semibold transition-all"
            style={{ background: "#00ff88", color: "#060a0f", boxShadow: "0 0 12px #00ff8833" }}
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Report content — this is what gets printed */}
      <div id="report-content" className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8 print:p-0 print:max-w-none print:space-y-6">

        {/* Report header */}
        <div className="print-header rounded-lg p-8" style={{ background: "linear-gradient(135deg, #0a1a12, #0d2a1c)", border: "1px solid #00ff8833", boxShadow: "0 0 40px #00ff8808" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm font-mono" style={{ background: "#00ff88", color: "#060a0f" }}>
              CR
            </div>
            <span className="text-xl font-bold font-mono" style={{ color: "#e6edf3" }}>Cawarden Reclaim</span>
          </div>
          <p className="font-mono text-sm" style={{ color: "#00ff88" }}>
            Analytics Report · {rangeLabel[range]} · {today}
          </p>
          <p className="font-mono text-xs mt-1" style={{ color: "#484f58" }}>cawardenreclaim.co.uk</p>
        </div>

        {/* GA Traffic */}
        <section>
          <h2 className="report-section-label">Website Traffic · Google Analytics 4</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
              <>
                <StatCard title="Sessions" value={data?.ga.sessions ?? 0} change={data?.ga.sessionsChange} icon={Globe} iconColor="text-blue-500" />
                <StatCard title="Users" value={data?.ga.users ?? 0} change={data?.ga.usersChange} icon={Users} iconColor="text-purple-500" />
                <StatCard title="Page Views" value={data?.ga.pageviews ?? 0} change={data?.ga.pageviewsChange} icon={Eye} iconColor="text-brand-500" />
                <StatCard title="New Users" value={data?.ga.newUsers ?? 0} icon={TrendingUp} iconColor="text-green-500"
                  subtitle={`${data ? formatPercent((data.ga.newUsers / data.ga.users) * 100) : "—"} of total users`} />
              </>
            )}
          </div>
        </section>

        {/* GSC */}
        <section>
          <h2 className="report-section-label">Organic Search · Google Search Console</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
              <>
                <StatCard title="Organic Clicks" value={data?.gsc.totalClicks ?? 0} change={data?.gsc.clicksChange} icon={MousePointerClick} iconColor="text-orange-500" />
                <StatCard title="Impressions" value={data?.gsc.totalImpressions ?? 0} change={data?.gsc.impressionsChange} icon={Search} iconColor="text-indigo-500" />
                <StatCard title="Avg. CTR" value={data ? `${formatPercent(data.gsc.avgCtr)}` : "—"} icon={Zap} iconColor="text-yellow-500" subtitle="Click-through rate" />
                <StatCard title="Avg. Position" value={data ? `#${formatPosition(data.gsc.avgPosition)}` : "—"} icon={Target} iconColor="text-teal-500" subtitle="Average rank on Google" />
              </>
            )}
          </div>
        </section>

        {/* Top Queries */}
        <section>
          <Card title="Top Search Queries" subtitle="Driving the most organic clicks this period" accent="orange">
            <div className="space-y-1">
              {(data?.topQueries ?? []).slice(0, 10).map((q, i) => {
                const maxClicks = Math.max(...(data?.topQueries ?? []).map((x) => x.clicks), 1);
                const pct = (q.clicks / maxClicks) * 100;
                return (
                  <div key={i} className="py-2 border-b border-[#1e2d3d] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#30363d] w-5 shrink-0 text-right">{i + 1}</span>
                      <span className="text-sm text-[#c9d1d9] truncate flex-1">{q.query}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-[#6e7681] tabular-nums">{formatNumber(q.clicks)} clicks</span>
                        <span className="text-xs text-[#30363d] tabular-nums">{formatPercent(q.ctr)} CTR</span>
                        <Badge variant={q.position <= 3 ? "green" : q.position <= 10 ? "blue" : "yellow"}>
                          #{formatPosition(q.position)}
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-8 mt-1 h-1 bg-[#161b22] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: q.position <= 3 ? "#22c55e" : q.position <= 10 ? "#3b82f6" : "#00ff88" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Top Pages */}
        <section>
          <Card title="Top Pages by Traffic" subtitle="Pages with the most sessions this period" accent="blue">
            <div className="space-y-1">
              {(data?.topPages ?? []).slice(0, 8).map((p, i) => {
                const maxSess = Math.max(...(data?.topPages ?? []).map((x) => x.sessions), 1);
                const pct = (p.sessions / maxSess) * 100;
                return (
                  <div key={i} className="py-2 border-b border-[#1e2d3d] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#30363d] w-5 shrink-0 text-right">{i + 1}</span>
                      <span className="text-sm text-[#8b949e] truncate flex-1">{p.pagePath === "/" ? "Home" : p.pagePath}</span>
                      <span className="text-xs font-semibold text-[#8b949e] shrink-0 bg-[#0a1420] text-[#79c0ff] px-2 py-0.5 rounded-full tabular-nums">
                        {formatNumber(p.sessions)}
                      </span>
                    </div>
                    <div className="ml-8 mt-1 h-1 bg-[#161b22] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "#6366f1" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* SEO Opportunities */}
        {data && data.opportunities.length > 0 && (
          <section>
            <Card title="SEO Opportunities" subtitle="Top quick wins identified from Search Console data" accent="green">
              <div className="space-y-3">
                {data.opportunities.slice(0, 8).map((o, i) => {
                  const pagePath = o.page ? o.page.replace("https://cawardenreclaim.co.uk", "") : null;
                  const isQuickWin = o.opportunityType === "quick-win";
                  return (
                    <div key={i} className="p-3 rounded-xl border border-[#21262d] bg-[#0d1117]/60 hover:bg-[#161b22] hover:shadow-sm transition-all">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5 ${isQuickWin ? "bg-[#0a1a12]" : "bg-[#0a1420]"}`}>
                          {isQuickWin ? "🎯" : "✏️"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-[#e6edf3] truncate">{o.query}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                              isQuickWin ? "bg-[#0a1a12] text-[#56d364]" : "bg-[#0a1420] text-[#79c0ff]"
                            }`}>
                              {isQuickWin ? "Quick Win" : "CTR Fix"}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1a0e00] text-[#ffa657]">
                              +{formatNumber(o.potentialClicks)} potential clicks
                            </span>
                          </div>
                          <p className="text-xs text-[#484f58]">{o.recommendation}</p>
                          {o.page && (
                            <a href={o.page} target="_blank" rel="noopener noreferrer"
                              className="no-print inline-flex items-center gap-1 mt-1.5 text-xs text-brand-600 hover:underline font-medium">
                              <ExternalLink className="w-3 h-3" />
                              {pagePath && pagePath.length > 1 ? pagePath : "Home page"}
                            </a>
                          )}
                          {o.page && (
                            <span className="print-only text-xs text-[#6e7681]">{o.page}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-[#6e7681] pb-8 print:pb-4">
          Generated by Cawarden Analytics Hub · {today} ·{" "}
          <a href="https://cawardenreclaim.co.uk" className="text-brand-500 hover:underline">cawardenreclaim.co.uk</a>
        </div>

      </div>
    </div>
  );
}
