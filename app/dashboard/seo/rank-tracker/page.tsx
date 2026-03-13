"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Zap, Target,
  BarChart2, Clock, Search } from "lucide-react";
import type { KeywordRankRow, RankTrackerResponse } from "@/app/api/rank-tracker/route";

// ── Colours ───────────────────────────────────────────────────────────────────

const GREEN  = "#00ff88";
const AMBER  = "#e3b341";
const RED    = "#ff7b72";
const BLUE   = "#79c0ff";

function posColor(pos: number | null): string {
  if (pos === null) return "#484f58";
  if (pos <= 3)  return GREEN;
  if (pos <= 10) return AMBER;
  if (pos <= 20) return "#f97316";
  return RED;
}

function posLabel(pos: number | null): string {
  if (pos === null) return "—";
  return `#${pos.toFixed(1).replace(".0", "")}`;
}

function posBar(pos: number | null): number {
  // pct fill for a visual bar — position 1 = 100%, position 50+ = 0%
  if (pos === null) return 0;
  return Math.max(0, 100 - ((pos - 1) / 49) * 100);
}

type SortKey = "keyword" | "position" | "positionChange" | "clicks" | "impressions" | "ctr";
type SortDir = "asc" | "desc";

// ── Stat card ─────────────────────────────────────────────────────────────────

function Stat({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#484f58]">{label}</p>
      <p className="text-2xl font-black mt-1" style={{ color: color ?? "#e6edf3" }}>{value}</p>
      {sub && <p className="text-xs text-[#484f58] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Trend arrow ───────────────────────────────────────────────────────────────

function TrendBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="text-[#484f58] text-xs">—</span>;
  if (Math.abs(change) < 0.5)
    return <span className="flex items-center gap-1 text-xs text-[#484f58]"><Minus className="w-3 h-3" />same</span>;
  if (change > 0)
    return (
      <span className="flex items-center gap-1 text-xs font-bold" style={{ color: GREEN }}>
        <TrendingUp className="w-3.5 h-3.5" />+{change.toFixed(1)}
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-bold" style={{ color: RED }}>
      <TrendingDown className="w-3.5 h-3.5" />{change.toFixed(1)}
    </span>
  );
}

// ── Quick wins ────────────────────────────────────────────────────────────────

function QuickWins({ rows }: { rows: KeywordRankRow[] }) {
  const wins = rows
    .filter((r) => r.position !== null && r.position > 10 && r.position <= 30 && r.impressions >= 5)
    .sort((a, b) => (b.impressions - a.impressions));

  if (wins.length === 0) return null;

  return (
    <div className="bg-[#0d1117] border border-[#e3b34130] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#e3b34130] flex items-center gap-2.5 bg-[#1a1200]">
        <Zap className="w-4 h-4" style={{ color: AMBER }} />
        <h3 className="text-sm font-bold text-[#e6edf3]">Quick Wins</h3>
        <span className="text-xs text-[#484f58]">— ranking 11–30, push to page 1</span>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: "#e3b34120", color: AMBER }}>
          {wins.length} keywords
        </span>
      </div>
      <div className="divide-y divide-[#21262d]">
        {wins.slice(0, 8).map((r) => {
          const analyserHref = r.topPage
            ? `/dashboard/competitors/page-analyser?you=${encodeURIComponent(r.topPage)}`
            : null;
          return (
            <div key={r.keyword} className="px-5 py-3 flex items-center gap-4">
              <span className="text-sm font-mono font-bold min-w-[42px] text-right"
                style={{ color: posColor(r.position) }}>
                #{r.position?.toFixed(0)}
              </span>
              <span className="flex-1 text-sm text-[#c9d1d9] capitalize">{r.keyword}</span>
              <span className="text-xs text-[#484f58]">{r.impressions.toLocaleString()} impr</span>
              <span className="text-xs text-[#484f58]">{r.clicks} clicks</span>
              {analyserHref && (
                <Link href={analyserHref}
                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: "#3b82f620", color: BLUE, border: "1px solid #3b82f640" }}>
                  <BarChart2 className="w-3 h-3" /> Analyse
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main table row ────────────────────────────────────────────────────────────

function KwRow({ row }: { row: KeywordRankRow }) {
  const analyserHref = row.topPage
    ? `/dashboard/competitors/page-analyser?you=${encodeURIComponent(row.topPage)}`
    : null;
  const serpHref = `/dashboard/competitors/serp-scout?q=${encodeURIComponent(row.keyword)}`;

  return (
    <tr className="border-b border-[#21262d] hover:bg-[#161b22] transition-colors group">
      {/* Keyword */}
      <td className="px-4 py-3">
        <span className="text-sm text-[#c9d1d9] capitalize">{row.keyword}</span>
      </td>

      {/* Position */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="text-sm font-bold font-mono min-w-[36px]"
            style={{ color: posColor(row.position) }}
          >
            {posLabel(row.position)}
          </span>
          <div className="w-16 h-1.5 rounded-full bg-[#21262d] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${posBar(row.position)}%`,
                background: posColor(row.position),
              }}
            />
          </div>
        </div>
      </td>

      {/* Trend */}
      <td className="px-4 py-3">
        <TrendBadge change={row.positionChange} />
      </td>

      {/* Clicks */}
      <td className="px-4 py-3 text-sm text-[#8b949e] text-right">{row.clicks.toLocaleString()}</td>

      {/* Impressions */}
      <td className="px-4 py-3 text-sm text-[#8b949e] text-right">{row.impressions.toLocaleString()}</td>

      {/* CTR */}
      <td className="px-4 py-3 text-sm text-[#8b949e] text-right">
        {row.impressions > 0 ? `${row.ctr.toFixed(1)}%` : "—"}
      </td>

      {/* Page */}
      <td className="px-4 py-3 max-w-[180px]">
        {row.topPage ? (
          <a
            href={row.topPage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#484f58] hover:text-[#79c0ff] flex items-center gap-1 truncate transition-colors"
            title={row.topPage}
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{row.topPage.replace(/^https?:\/\/[^/]+/, "")}</span>
          </a>
        ) : (
          <span className="text-xs text-[#30363d]">no data</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={serpHref} title="SERP Scout"
            className="p-1.5 rounded-lg text-[#484f58] hover:text-[#00ff88] hover:bg-[#0a1a12] transition-colors">
            <Search className="w-3.5 h-3.5" />
          </Link>
          {analyserHref && (
            <Link href={analyserHref} title="Page Analyser"
              className="p-1.5 rounded-lg text-[#484f58] hover:text-[#79c0ff] hover:bg-[#0d1a2e] transition-colors">
              <BarChart2 className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Sort header ───────────────────────────────────────────────────────────────

function SortTh({ label, col, sortKey, sortDir, onSort, right = false }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void; right?: boolean;
}) {
  const active = sortKey === col;
  return (
    <th
      className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:text-[#c9d1d9] select-none transition-colors ${right ? "text-right" : "text-left"}`}
      style={{ color: active ? GREEN : "#484f58" }}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </span>
    </th>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RankTrackerPage() {
  const [data,      setData]      = useState<RankTrackerResponse | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [newKw,     setNewKw]     = useState("");
  const [extraKws,  setExtraKws]  = useState<string[]>([]);
  const [sortKey,   setSortKey]   = useState<SortKey>("position");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");
  const [filter,    setFilter]    = useState<"all" | "top10" | "top3" | "notranking">("all");
  const [period,    setPeriod]    = useState<28 | 90>(28);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rank-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: period, keywords: extraKws }),
      });
      const json = await res.json() as RankTrackerResponse;
      if (json.error && !json.rows?.length) { setError(json.error); }
      else { setData(json); }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [period, extraKws.length]); // eslint-disable-line

  const addKeyword = () => {
    const k = newKw.trim().toLowerCase();
    if (!k || extraKws.includes(k)) return;
    setExtraKws((prev) => [...prev, k]);
    setNewKw("");
  };

  const removeKeyword = (k: string) => setExtraKws((prev) => prev.filter((x) => x !== k));

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "keyword" ? "asc" : "desc"); }
  };

  const rows = useMemo(() => {
    if (!data?.rows) return [];
    let r = data.rows;

    // Text search
    if (search) r = r.filter((row) => row.keyword.includes(search.toLowerCase()));

    // Filter tab
    if (filter === "top3")       r = r.filter((row) => row.position !== null && row.position <= 3);
    if (filter === "top10")      r = r.filter((row) => row.position !== null && row.position <= 10);
    if (filter === "notranking") r = r.filter((row) => row.position === null || row.position > 30);

    // Sort
    r = [...r].sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (sortKey) {
        case "keyword":        av = a.keyword;         bv = b.keyword;         break;
        case "position":       av = a.position ?? 999; bv = b.position ?? 999; break;
        case "positionChange": av = a.positionChange ?? -999; bv = b.positionChange ?? -999; break;
        case "clicks":         av = a.clicks;          bv = b.clicks;          break;
        case "impressions":    av = a.impressions;     bv = b.impressions;     break;
        case "ctr":            av = a.ctr;             bv = b.ctr;             break;
        default: av = 0; bv = 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return r;
  }, [data, search, filter, sortKey, sortDir]);

  // Summary stats
  const ranked   = data?.rows.filter((r) => r.position !== null) ?? [];
  const top3     = ranked.filter((r) => r.position! <= 3).length;
  const top10    = ranked.filter((r) => r.position! <= 10).length;
  const avgPos   = ranked.length ? ranked.reduce((s, r) => s + r.position!, 0) / ranked.length : 0;
  const totalClicks = data?.rows.reduce((s, r) => s + r.clicks, 0) ?? 0;

  const asOf = data?.asOf ? new Date(data.asOf).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }) : null;

  return (
    <div className="max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">Keyword Rank Tracker</h1>
          <p className="text-sm text-[#484f58] mt-1">
            Real positions from Google Search Console — updated every 2 hours.
            {asOf && <span className="ml-2 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> as of {asOf}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period toggle */}
          {([28, 90] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors"
              style={{
                background: period === p ? "#00ff8820" : "transparent",
                color: period === p ? GREEN : "#484f58",
                borderColor: period === p ? "#00ff8840" : "#21262d",
              }}>
              {p}d
            </button>
          ))}
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#21262d] text-[#484f58] hover:text-[#c9d1d9] hover:border-[#30363d] transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#1e0a0a] border border-[#ff7b7240] rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[#ff7b72] shrink-0 mt-0.5" />
          <div className="text-sm text-[#ff7b72]">{error}</div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#161b22] border border-[#21262d] rounded-2xl px-5 py-4 animate-pulse h-20" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total tracked"   value={data.rows.length}        sub={`${period}d window`} />
            <Stat label="Top 3"           value={top3}                    color={GREEN}  sub="positions 1–3" />
            <Stat label="Top 10"          value={top10}                   color={AMBER}  sub="positions 1–10" />
            <Stat label="Avg position"    value={avgPos > 0 ? avgPos.toFixed(1) : "—"} sub={`${totalClicks.toLocaleString()} clicks`} />
          </div>

          {/* Quick wins */}
          <QuickWins rows={data.rows} />

          {/* Add keyword */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-2">
              <input
                value={newKw}
                onChange={(e) => setNewKw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addKeyword(); }}
                placeholder="Track another keyword…"
                className="bg-[#161b22] border border-[#21262d] rounded-xl px-3 py-1.5 text-xs font-mono text-[#c9d1d9] focus:outline-none focus:border-[#00ff8840] placeholder:text-[#30363d] w-60"
              />
              <button onClick={addKeyword}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                style={{ background: "#00ff8820", color: GREEN, border: "1px solid #00ff8840" }}>
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {extraKws.map((k) => (
              <span key={k} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border border-[#21262d] text-[#8b949e]">
                {k}
                <button onClick={() => removeKeyword(k)} className="hover:text-[#ff7b72] transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Filter + search bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "top3", "top10", "notranking"] as const).map((f) => {
              const labels: Record<typeof f, string> = {
                all: `All (${data.rows.length})`,
                top3: `Top 3 (${top3})`,
                top10: `Top 10 (${top10})`,
                notranking: "Not ranking",
              };
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors"
                  style={{
                    background: filter === f ? "#00ff8820" : "transparent",
                    color: filter === f ? GREEN : "#484f58",
                    borderColor: filter === f ? "#00ff8840" : "#21262d",
                  }}>
                  {labels[f]}
                </button>
              );
            })}
            <div className="ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search keywords…"
                  className="bg-[#161b22] border border-[#21262d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#00ff8840] placeholder:text-[#30363d] w-52"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0d1117] border border-[#21262d] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#21262d] bg-[#161b22]">
                    <SortTh label="Keyword"    col="keyword"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Position"   col="position"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Change"     col="positionChange" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Clicks"     col="clicks"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                    <SortTh label="Impressions" col="impressions"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                    <SortTh label="CTR"        col="ctr"            sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-left text-[#484f58]">Top Page</th>
                    <th className="px-4 py-3 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#484f58]">
                        {search ? "No keywords match your search." : "No data yet."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => <KwRow key={r.keyword} row={r} />)
                  )}
                </tbody>
              </table>
            </div>

            {rows.length > 0 && (
              <div className="px-4 py-2.5 border-t border-[#21262d] flex items-center justify-between text-xs text-[#484f58]">
                <span>{rows.length} keyword{rows.length !== 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Hover a row for quick actions
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
