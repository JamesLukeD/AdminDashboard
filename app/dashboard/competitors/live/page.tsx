"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  ArrowLeft, RefreshCw, Zap, TrendingUp, TrendingDown,
  Minus, ExternalLink, AlertTriangle, ArrowUp, ArrowDown,
  Database, BarChart2,
} from "lucide-react";
import type { SemrushLiveResponse, SemrushLiveDomain, SemrushLiveKeyword } from "@/app/api/semrush-live/route";
import { TRACKED_COMPETITORS } from "@/lib/tracked-competitors";

// ── Constants ─────────────────────────────────────────────────────────────────

const CAWARDEN_DOMAIN = "cawardenreclaim.co.uk";
const CAWARDEN_COLOR  = "#00ff88";
const THEM_COLORS     = ["#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"];

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function timeSince(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

// ── Keyword Gap logic (client-side) ──────────────────────────────────────────

interface GapRow {
  keyword: string;
  searchVolume: number;
  kd: number;
  cawardenPos: number | null;
  theirPos: number | null;
  cawardenUrl: string;
  theirUrl: string;
  type: "gap" | "behind" | "ahead" | "both";
}

function buildGap(cawarden: SemrushLiveDomain, them: SemrushLiveDomain): GapRow[] {
  const youMap   = new Map(cawarden.keywords.map((k) => [k.keyword.toLowerCase(), k]));
  const themMap  = new Map(them.keywords.map((k)     => [k.keyword.toLowerCase(), k]));
  const allKws   = new Set([...youMap.keys(), ...themMap.keys()]);
  const rows: GapRow[] = [];

  for (const kw of allKws) {
    const y = youMap.get(kw);
    const t = themMap.get(kw);
    const yPos = y?.position ?? null;
    const tPos = t?.position ?? null;

    let type: GapRow["type"];
    if (!yPos && tPos)               type = "gap";
    else if (yPos && tPos && yPos > tPos) type = "behind";
    else if (yPos && tPos && yPos <= tPos) type = "ahead";
    else                              type = "both";

    rows.push({
      keyword:     kw,
      searchVolume: t?.searchVolume ?? y?.searchVolume ?? 0,
      kd:           t?.kd ?? y?.kd ?? 0,
      cawardenPos: yPos,
      theirPos:    tPos,
      cawardenUrl: y?.url ?? "",
      theirUrl:    t?.url ?? "",
      type,
    });
  }

  return rows.sort((a, b) => b.searchVolume - a.searchVolume);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PosBadge({ pos }: { pos: number | null }) {
  if (pos === null) {
    return <span className="text-xs text-[#484f58]">—</span>;
  }
  const color =
    pos <= 3  ? "#00ff88" :
    pos <= 10 ? "#f59e0b" :
    pos <= 20 ? "#6e7681" : "#374151";
  return (
    <span className="font-mono font-bold text-sm" style={{ color }}>
      #{pos}
    </span>
  );
}

function GapTypeBadge({ type }: { type: GapRow["type"] }) {
  const map = {
    gap:    { label: "Gap",    bg: "#1a0a2e", text: "#8b5cf6", border: "#8b5cf650" },
    behind: { label: "Behind", bg: "#1a0505", text: "#ef4444", border: "#ef444450" },
    ahead:  { label: "Ahead",  bg: "#0a1a12", text: "#00ff88", border: "#00ff8850" },
    both:   { label: "Both",   bg: "#0a0e14", text: "#6e7681", border: "#6e768150" },
  } as const;
  const s = map[type];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

function DomainCard({
  entry,
  color,
  isSelected,
  isCawarden,
  onClick,
}: {
  entry: SemrushLiveDomain;
  color: string;
  isSelected: boolean;
  isCawarden: boolean;
  onClick?: () => void;
}) {
  const o = entry.overview;
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border p-4 space-y-3 transition-all hover:border-opacity-80 w-full"
      style={{
        background: isSelected ? `${color}12` : "#0d1117",
        borderColor: isSelected ? color : "#21262d",
        cursor: isCawarden ? "default" : "pointer",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="font-semibold text-sm text-[#c9d1d9] truncate">{entry.label}</span>
        {isSelected && !isCawarden && (
          <span
            className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            Selected
          </span>
        )}
        {isCawarden && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0a1a12] text-[#00ff88]">
            You
          </span>
        )}
      </div>
      <p className="text-[11px] text-[#484f58] truncate">{entry.domain}</p>
      <div className="grid grid-cols-2 gap-2 pt-1">
        {[
          { label: "Org. Keywords", value: fmtNum(o.organicKeywords) },
          { label: "Est. Traffic",  value: fmtNum(o.organicTraffic)  },
          { label: "Top 50 KWs",    value: fmtNum(entry.keywords.length) },
          { label: "Avg Position",  value: entry.keywords.length
              ? (entry.keywords.reduce((s, k) => s + k.position, 0) / entry.keywords.length).toFixed(1)
              : "—",
          },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-[10px] text-[#484f58] uppercase tracking-wide">{s.label}</p>
            <p className="text-base font-bold text-[#c9d1d9]">{s.value}</p>
          </div>
        ))}
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LiveIntelPage() {
  const [data,       setData]       = useState<SemrushLiveResponse | null>(null);
  // idle = nothing loaded yet; loading = reading cache; fetching = hitting SEMrush API
  const [status, setStatus] = useState<"idle" | "loading" | "fetching">("idle");
  const isFetching = status === "fetching";
  const [selectedDomain, setSelectedDomain] = useState<string>(
    TRACKED_COMPETITORS[0]?.domainPattern ?? "",
  );
  const [gapFilter, setGapFilter] = useState<"all" | "gap" | "behind" | "ahead">("all");
  const [search,    setSearch]    = useState("");

  // Read from cache only — never spends units
  async function loadFromCache() {
    setStatus("loading");
    try {
      const res = await fetch("/api/semrush-live");
      const json: SemrushLiveResponse = await res.json();
      // Only show data if the cache actually has results
      if (json.cachedAt && json.domains && Object.keys(json.domains).length > 0) {
        setData(json);
        const valid = TRACKED_COMPETITORS.map((c) => c.domainPattern).filter((d) => json.domains[d]);
        if (!json.domains[selectedDomain] && valid.length) setSelectedDomain(valid[0]);
      }
    } finally {
      setStatus("idle");
    }
  }

  // Hits SEMrush API — spends units
  async function runFetch() {
    setStatus("fetching");
    try {
      const res = await fetch("/api/semrush-live?bust=1");
      const json: SemrushLiveResponse = await res.json();
      setData(json);
      const valid = TRACKED_COMPETITORS.map((c) => c.domainPattern).filter((d) => json.domains[d]);
      if (!json.domains[selectedDomain] && valid.length) setSelectedDomain(valid[0]);
    } finally {
      setStatus("idle");
    }
  }

  // On mount: check cache only — never auto-spends units
  useEffect(() => { loadFromCache(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Domain color map
  const domainColors = useMemo(() => {
    const map: Record<string, string> = { [CAWARDEN_DOMAIN]: CAWARDEN_COLOR };
    TRACKED_COMPETITORS.forEach((c, i) => {
      map[c.domainPattern] = THEM_COLORS[i % THEM_COLORS.length];
    });
    return map;
  }, []);

  // Ordered list for scoreboard
  const orderedDomains = useMemo(() => {
    if (!data?.domains) return [];
    return [CAWARDEN_DOMAIN, ...TRACKED_COMPETITORS.map((c) => c.domainPattern)]
      .map((d) => data.domains[d])
      .filter(Boolean);
  }, [data]);

  // Scoreboard chart data
  const trafficChartData = useMemo(
    () =>
      [...orderedDomains]
        .sort((a, b) => b.overview.organicTraffic - a.overview.organicTraffic)
        .map((d) => ({
          label: d.label,
          domain: d.domain,
          traffic: d.overview.organicTraffic,
          keywords: d.overview.organicKeywords,
        })),
    [orderedDomains],
  );

  // Keyword gap
  const gapRows = useMemo(() => {
    if (!data?.domains) return [];
    const cawarden = data.domains[CAWARDEN_DOMAIN];
    const them     = data.domains[selectedDomain];
    if (!cawarden || !them) return [];
    return buildGap(cawarden, them);
  }, [data, selectedDomain]);

  const filteredGap = useMemo(() => {
    return gapRows
      .filter((r) =>
        (gapFilter === "all" || r.type === gapFilter) &&
        (search === "" || r.keyword.toLowerCase().includes(search.toLowerCase())),
      );
  }, [gapRows, gapFilter, search]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (status === "fetching") {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#6e7681] text-sm">Fetching live SEMrush data…</p>
        <p className="text-[#484f58] text-xs">~3,000 API units — cached for 24 h</p>
      </div>
    );
  }

  // No cache yet — show a prompt instead of auto-fetching
  if (!data || data.error) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-5 p-8">
        {data?.error && (
          <div className="flex items-center gap-2 bg-[#1a0505] border border-[#ef444450] rounded-xl px-4 py-3 text-sm text-[#ef4444] max-w-md text-center">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{data.error}</span>
          </div>
        )}
        <div className="w-14 h-14 rounded-2xl bg-[#161b22] border border-[#21262d] flex items-center justify-center">
          <Zap className="w-7 h-7 text-[#f59e0b]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[#c9d1d9] font-bold text-lg">No data yet</p>
          <p className="text-[#6e7681] text-sm max-w-sm">
            Click below to run a live SEMrush pull for Cawarden and all 5 tracked competitors.
          </p>
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-[#484f58] uppercase tracking-wide">Unit cost</p>
          <p className="text-[#f59e0b] font-bold text-lg">~3,060 units</p>
          <p className="text-[11px] text-[#484f58]">Result cached for 24 h — won't re-charge on refresh</p>
        </div>
        <button
          onClick={runFetch}
          className="flex items-center gap-2 bg-[#00ff88] text-[#060a0f] font-bold px-6 py-3 rounded-xl hover:bg-[#00cc77] transition-colors text-sm"
        >
          <Zap className="w-4 h-4" />
          Run Analysis
        </button>
        <Link href="/dashboard/competitors" className="text-[#484f58] text-xs underline underline-offset-4 hover:text-[#6e7681]">
          ← Back to Competitors
        </Link>
      </div>
    );
  }

  const selectedEntry = data?.domains[selectedDomain];
  const selectedColor = domainColors[selectedDomain] ?? THEM_COLORS[0];

  const gapCount    = gapRows.filter((r) => r.type === "gap").length;
  const behindCount = gapRows.filter((r) => r.type === "behind").length;
  const aheadCount  = gapRows.filter((r) => r.type === "ahead").length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 border-b border-[#21262d] bg-[#0d1117]/95 backdrop-blur px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard/competitors" className="text-[#6e7681] hover:text-[#c9d1d9] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-bold text-[#c9d1d9] text-sm">Live Competitor Intelligence</h1>
          <p className="text-[10px] text-[#484f58]">
            SEMrush API · UK database · cached for 24 h
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {data?.cachedAt && (
            <span className="text-xs text-[#484f58]">
              Updated {timeSince(data.cachedAt)}
            </span>
          )}
          {data?.totalUnitsUsed != null && (
            <div className="flex items-center gap-1.5 bg-[#161b22] border border-[#21262d] rounded-lg px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="text-xs font-semibold text-[#f59e0b]">
                {data.totalUnitsUsed.toLocaleString()} units used
              </span>
            </div>
          )}
          <button
            onClick={runFetch}
            disabled={isFetching}
            className="flex items-center gap-1.5 bg-[#161b22] border border-[#21262d] rounded-lg px-3 py-1.5 text-xs font-medium text-[#6e7681] hover:text-[#c9d1d9] hover:border-[#30363d] transition-all disabled:opacity-50"
            title="Fetch fresh data from SEMrush (~3,060 units)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Update
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* ── Scoreboard ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#00ff88]" />
            <h2 className="font-bold text-sm text-[#c9d1d9] uppercase tracking-wide">Traffic Scoreboard</h2>
            <span className="text-xs text-[#484f58] ml-1">Estimated organic traffic · UK</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Bar chart */}
            <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-4">
              <p className="text-xs text-[#484f58] uppercase tracking-wide mb-3">Organic Traffic</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trafficChartData} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtNum} tick={{ fill: "#484f58", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: "#6e7681", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }}
                    labelStyle={{ color: "#c9d1d9", fontWeight: 600 }}
                    formatter={(v) => [fmtNum(Number(v ?? 0)), "Est. Traffic"]}
                  />
                  <Bar dataKey="traffic" radius={[0, 4, 4, 0]}>
                    {trafficChartData.map((entry) => (
                      <Cell key={entry.domain} fill={domainColors[entry.domain] ?? THEM_COLORS[0]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Keyword count chart */}
            <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-4">
              <p className="text-xs text-[#484f58] uppercase tracking-wide mb-3">Total Organic Keywords</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[...trafficChartData].sort((a, b) => b.keywords - a.keywords)}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtNum} tick={{ fill: "#484f58", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: "#6e7681", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }}
                    labelStyle={{ color: "#c9d1d9", fontWeight: 600 }}
                    formatter={(v) => [fmtNum(Number(v ?? 0)), "Keywords"]}
                  />
                  <Bar dataKey="keywords" radius={[0, 4, 4, 0]}>
                    {[...trafficChartData]
                      .sort((a, b) => b.keywords - a.keywords)
                      .map((entry) => (
                        <Cell key={entry.domain} fill={domainColors[entry.domain] ?? THEM_COLORS[0]} fillOpacity={0.85} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── Domain cards ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#00ff88]" />
            <h2 className="font-bold text-sm text-[#c9d1d9] uppercase tracking-wide">Select Competitor to Analyse</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {orderedDomains.map((entry) => (
              <DomainCard
                key={entry.domain}
                entry={entry}
                color={domainColors[entry.domain] ?? THEM_COLORS[0]}
                isSelected={entry.domain === selectedDomain}
                isCawarden={entry.domain === CAWARDEN_DOMAIN}
                onClick={entry.domain === CAWARDEN_DOMAIN ? undefined : () => setSelectedDomain(entry.domain)}
              />
            ))}
          </div>
        </section>

        {/* ── Keyword Gap ── */}
        {selectedEntry && data?.domains[CAWARDEN_DOMAIN] && (
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: selectedColor }} />
                <h2 className="font-bold text-sm text-[#c9d1d9] uppercase tracking-wide">
                  Keyword Gap — Cawarden vs{" "}
                  <span style={{ color: selectedColor }}>{selectedEntry.label}</span>
                </h2>
              </div>
              <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
                {/* Stat pills */}
                {[
                  { key: "gap",    label: `${gapCount} Gaps`,    color: "#8b5cf6" },
                  { key: "behind", label: `${behindCount} Behind`, color: "#ef4444" },
                  { key: "ahead",  label: `${aheadCount} Ahead`,  color: "#00ff88" },
                  { key: "all",    label: "All",                   color: "#6e7681" },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setGapFilter(key as typeof gapFilter)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                    style={
                      gapFilter === key
                        ? { background: `${color}20`, color, borderColor: `${color}50` }
                        : { background: "#0d1117", color: "#484f58", borderColor: "#21262d" }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter keywords…"
              className="w-full sm:w-72 bg-[#161b22] border border-[#21262d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] placeholder:text-[#484f58] focus:outline-none focus:border-[#30363d]"
            />

            {/* Table */}
            <div className="bg-[#161b22] rounded-2xl border border-[#21262d] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#21262d]">
                      {["Keyword", "Volume", "KD", "Cawarden", "Competitor", "Type"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#484f58]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]">
                    {filteredGap.slice(0, 100).map((row) => {
                      const diff =
                        row.cawardenPos !== null && row.theirPos !== null
                          ? row.cawardenPos - row.theirPos
                          : null;
                      return (
                        <tr key={row.keyword} className="hover:bg-[#21262d]/40 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-[#c9d1d9] max-w-[260px]">
                            <span className="block truncate">{row.keyword}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-[#8b949e]">
                            {fmtNum(row.searchVolume)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="text-xs font-semibold"
                              style={{
                                color:
                                  row.kd >= 70 ? "#ef4444" :
                                  row.kd >= 40 ? "#f59e0b" : "#00ff88",
                              }}
                            >
                              {row.kd > 0 ? row.kd : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <PosBadge pos={row.cawardenPos} />
                              {row.cawardenUrl && (
                                <a
                                  href={row.cawardenUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#484f58] hover:text-[#00ff88] transition-colors truncate max-w-[140px] block"
                                >
                                  {row.cawardenUrl.replace(/^https?:\/\//, "")}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <PosBadge pos={row.theirPos} />
                              {row.theirUrl && (
                                <a
                                  href={row.theirUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#484f58] hover:text-[#3b82f6] transition-colors truncate max-w-[140px] block"
                                >
                                  {row.theirUrl.replace(/^https?:\/\//, "")}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <GapTypeBadge type={row.type} />
                              {diff !== null && (
                                <span
                                  className="text-xs font-semibold flex items-center gap-0.5"
                                  style={{ color: diff > 0 ? "#ef4444" : "#00ff88" }}
                                >
                                  {diff > 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                                  {Math.abs(diff)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredGap.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#484f58] text-sm">
                          No keywords match your current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredGap.length > 100 && (
                <div className="px-4 py-2 border-t border-[#21262d] text-xs text-[#484f58] text-center">
                  Showing top 100 of {filteredGap.length} keywords
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
