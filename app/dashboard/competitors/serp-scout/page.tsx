"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, ArrowLeft, ExternalLink, Trophy, AlertTriangle,
  ChevronRight, BarChart2, BookOpen, Zap, RefreshCw, Target,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import type { SerpScoutResponse, SerpResult } from "@/app/api/serp-scout/route";
import { TRACKED_COMPETITORS, getTrackedCompetitor } from "@/lib/tracked-competitors";

// ── Constants ────────────────────────────────────────────────────────────────

const CAWARDEN_URL = "https://cawardenreclaim.co.uk";

const PRESET_KEYWORDS: { category: string; terms: string[] }[] = [
  {
    category: "Roofing",
    terms: [
      "reclaimed ridge tiles",
      "reclaimed roof tiles",
      "reclaimed clay roof tiles",
      "reclaimed slate roof tiles",
      "reclaimed chimney pots",
      "antique chimney pots",
    ],
  },
  {
    category: "Paving & Stone",
    terms: [
      "reclaimed cobblestones",
      "reclaimed yorkstone paving",
      "reclaimed granite setts",
      "reclaimed stone flags",
      "antique stone paving slabs",
      "reclaimed paving stones UK",
    ],
  },
  {
    category: "Bricks & Blocks",
    terms: [
      "reclaimed bricks",
      "reclaimed imperial bricks",
      "Victorian reclaimed bricks",
      "reclaimed engineering bricks",
      "reclaimed terracotta tiles",
    ],
  },
  {
    category: "Timber",
    terms: [
      "reclaimed oak beams",
      "reclaimed timber beams",
      "reclaimed floorboards",
      "reclaimed parquet flooring",
    ],
  },
  {
    category: "General",
    terms: [
      "reclaimed building materials UK",
      "architectural salvage",
      "reclaimed materials suppliers UK",
      "salvage yard Yorkshire",
    ],
  },
];

const YOU_COLOR   = "#00ff88";
const THEM_COLOR  = "#3b82f6";
const WARN_COLOR  = "#e3b341";
const BAD_COLOR   = "#ff7b72";

function positionColor(pos: number): string {
  if (pos <= 3) return YOU_COLOR;
  if (pos <= 7) return WARN_COLOR;
  return BAD_COLOR;
}

function positionLabel(pos: number | null): string {
  if (pos === null) return "Not in top 10";
  if (pos === 1) return "#1";
  return `#${pos}`;
}

// ── SERP Result Card ──────────────────────────────────────────────────────────

function ResultCard({
  result,
  cawardenUrl,
}: {
  result: SerpResult;
  cawardenUrl: string;
}) {
  const analyserHref = `/dashboard/competitors/page-analyser?them=${encodeURIComponent(result.url)}&you=${encodeURIComponent(cawardenUrl)}`;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        result.isCawarden
          ? "border-[#00ff8840] bg-[#0a1a12]"
          : "border-[#21262d] bg-[#161b22]"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Position badge */}
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
          style={{
            background: result.isCawarden ? "#00ff8820" : `${positionColor(result.position)}15`,
            color: result.isCawarden ? YOU_COLOR : positionColor(result.position),
            border: `1px solid ${result.isCawarden ? "#00ff8840" : positionColor(result.position) + "40"}`,
          }}
        >
          {result.position}
        </div>

        <div className="flex-1 min-w-0">
          {/* Domain + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="text-xs font-bold font-mono"
              style={{ color: result.isCawarden ? YOU_COLOR : "#c9d1d9" }}
            >
              {result.displayLink}
            </span>
            {result.isCawarden && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#00ff8820", color: YOU_COLOR }}>
                ← YOU ARE HERE
              </span>
            )}
            {result.position === 1 && !result.isCawarden && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#e3b34120", color: WARN_COLOR }}>
                TOP COMPETITOR
              </span>
            )}
            {!result.isCawarden && (() => {
              const tc = getTrackedCompetitor(result.domain);
              return tc ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#8b5cf620", color: "#a78bfa" }}>
                  {tc.name}
                </span>
              ) : null;
            })()}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-[#e6edf3] leading-snug mb-1 line-clamp-2">
            {result.title}
          </p>

          {/* Snippet */}
          <p className="text-xs text-[#484f58] leading-relaxed line-clamp-2">
            {result.snippet}
          </p>
        </div>

        {/* Actions */}
        {!result.isCawarden && (
          <div className="shrink-0 flex flex-col gap-1.5">
            <Link
              href={analyserHref}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: "#3b82f620", color: THEM_COLOR, border: "1px solid #3b82f640" }}
            >
              <BarChart2 className="w-3 h-3" /> Analyse
            </Link>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#21262d] text-[#484f58] hover:text-[#c9d1d9] hover:border-[#30363d] transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Visit
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Content Intel Panel ───────────────────────────────────────────────────────

function ContentIntel({ results, query }: { results: SerpResult[]; query: string }) {
  const competitors = results.filter((r) => !r.isCawarden).slice(0, 5);
  if (competitors.length === 0) return null;

  // Extract content signals from snippets (rough heuristic from available data)
  const domains = competitors.map((r) => r.domain);

  // Detect content types from snippets & titles
  const hasPrice  = competitors.filter((r) =>
    /£|\bprice\b|\bcost\b|\bper\b/i.test(r.snippet + r.title)).length;
  const hasDimensions = competitors.filter((r) =>
    /\bmm\b|\bcm\b|\binch\b|\bsize\b|\bdimension/i.test(r.snippet + r.title)).length;
  const hasDelivery = competitors.filter((r) =>
    /deliver|\bship\b|\bcollect/i.test(r.snippet + r.title)).length;
  const hasHistory = competitors.filter((r) =>
    /histor|\boriginal\b|\bperiod\b|\btradit|\bauthentic/i.test(r.snippet + r.title)).length;
  const hasBulkOffer = competitors.filter((r) =>
    /\bbulk\b|\btrade\b|\bwholesale\b|\bpallet/i.test(r.snippet + r.title)).length;
  const hasInstall = competitors.filter((r) =>
    /install|\bfit\b|\blay\b|\bguide\b|\bhow to/i.test(r.snippet + r.title)).length;

  const signals = [
    { label: "Pricing / cost mentions",    count: hasPrice,     icon: "£", tip: "Add price guide or 'price on request' messaging" },
    { label: "Size / dimensions",          count: hasDimensions, icon: "⇔", tip: "List standard sizes available in stock" },
    { label: "Delivery / collection info", count: hasDelivery,  icon: "🚚", tip: "Mention delivery areas and collection from yard" },
    { label: "Historical / authentic copy",count: hasHistory,   icon: "🏛", tip: "Tell the story — where materials come from, period authenticity" },
    { label: "Bulk / trade offers",        count: hasBulkOffer, icon: "📦", tip: "Call out trade accounts, bulk discounts, pallet pricing" },
    { label: "Installation guidance",      count: hasInstall,   icon: "🔧", tip: "Add how-to guides or link to fitting advice" },
  ];

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#21262d] flex items-center gap-2.5">
        <BookOpen className="w-4 h-4 text-[#e3b341]" />
        <h3 className="font-bold text-[#e6edf3] text-sm">Content Intelligence</h3>
        <span className="text-xs text-[#484f58] ml-1">— what top {competitors.length} pages are doing</span>
      </div>

      {/* Who's ranking */}
      <div className="px-5 py-3 border-b border-[#21262d]">
        <p className="text-xs text-[#484f58] font-semibold uppercase tracking-wide mb-2">Outranking Cawarden</p>
        <div className="flex flex-wrap gap-2">
          {domains.map((d, i) => (
            <span key={d} className="text-xs font-mono px-2.5 py-1 rounded-lg border border-[#21262d] text-[#c9d1d9]">
              <span style={{ color: positionColor(i + 1) }}>#{i + 1}</span> {d}
            </span>
          ))}
        </div>
      </div>

      {/* Content signals */}
      <div className="px-5 py-4 space-y-2.5">
        <p className="text-xs text-[#484f58] font-semibold uppercase tracking-wide mb-3">Content signals detected across top pages</p>
        {signals.map(({ label, count, icon, tip }) => (
          <div key={label} className="flex items-start gap-3">
            <span className="text-sm w-5 shrink-0 mt-0.5">{icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-[#c9d1d9] font-semibold">{label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                  style={{
                    background: count >= 3 ? "#00ff8820" : count >= 1 ? "#e3b34120" : "#30363d",
                    color: count >= 3 ? YOU_COLOR : count >= 1 ? WARN_COLOR : "#484f58",
                  }}>
                  {count}/{competitors.length} pages
                </span>
              </div>
              {count < competitors.length && (
                <p className="text-[11px] text-[#484f58]">→ {tip}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Content brief CTA */}
      <div className="px-5 py-4 border-t border-[#21262d] bg-[#0a1a12]">
        <p className="text-xs font-bold text-[#00ff88] mb-1.5">Content brief for <span className="font-mono">"{query}"</span> landing page:</p>
        <ul className="space-y-1">
          {signals.filter((s) => s.count > 0).map(({ label, tip }) => (
            <li key={label} className="flex items-start gap-2 text-xs text-[#8b949e]">
              <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-[#00ff8840]" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Competitor Watchlist ───────────────────────────────────────────────────────

function CompetitorWatchlist({ results }: { results: SerpResult[] }) {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#21262d] flex items-center gap-2.5">
        <Target className="w-4 h-4 text-[#a78bfa]" />
        <h3 className="font-bold text-[#e6edf3] text-sm">Competitor Watchlist</h3>
        <span className="text-xs text-[#484f58] ml-1">— your 5 tracked rivals</span>
      </div>
      <div className="divide-y divide-[#21262d]">
        {TRACKED_COMPETITORS.map((tc) => {
          const hit = results.find((r) => !r.isCawarden && r.domain.toLowerCase().includes(tc.domainPattern.toLowerCase()));
          return (
            <div key={tc.name} className="px-5 py-3 flex items-center gap-3">
              <div
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                style={
                  hit
                    ? { background: "#8b5cf620", color: "#a78bfa", border: "1px solid #8b5cf640" }
                    : { background: "#0d1117", color: "#484f58", border: "1px solid #21262d" }
                }
              >
                {hit ? `#${hit.position}` : "—"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#c9d1d9] truncate">{tc.name}</p>
                {hit && (
                  <p className="text-[11px] font-mono text-[#484f58] truncate">{hit.domain}</p>
                )}
              </div>
              {hit ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: "#8b5cf620", color: "#a78bfa" }}>
                  In top 10
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border border-[#21262d] text-[#484f58]">
                  Not ranking
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "done" | "error";

export default function SerpScoutPage() {
  const searchParams = useSearchParams();
  const [activeQuery,  setActiveQuery]  = useState("");
  const [customQuery,  setCustomQuery]  = useState("");
  const [status,       setStatus]       = useState<Status>("idle");
  const [result,       setResult]       = useState<SerpScoutResponse | null>(null);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [cawardenPage, setCawardenPage] = useState(CAWARDEN_URL);
  const [lastFetched,  setLastFetched]  = useState<string | null>(null);

  const search = async (q: string) => {
    if (!q.trim()) return;
    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    setActiveQuery(q.trim());

    try {
      const res = await fetch("/api/serp-scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim() }),
      });
      const data = await res.json() as SerpScoutResponse & { error?: string };
      if (data.error && !data.results) {
        setErrorMsg(data.error); setStatus("error");
      } else {
        setResult(data);
        setStatus("done");
        setLastFetched(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  // Auto-run if linked from Rank Tracker with ?q=
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setCustomQuery(q); void search(q); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cawardenRank: number | null = result?.cawardenPosition ?? null;
  const notRanking   = status === "done" && cawardenRank === null;

  return (
    <div className="max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#e6edf3]">SERP Scout</h1>
          <p className="text-sm text-[#484f58] mt-1">
            See who outranks Cawarden on Google UK, what their pages contain, and what content to build.
          </p>
        </div>
        <Link
          href="/dashboard/competitors"
          className="flex items-center gap-1.5 text-xs font-mono text-[#484f58] hover:text-[#00ff88] transition-colors border border-[#21262d] rounded-xl px-3 py-2 hover:border-[#00ff8840]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Overview
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

        {/* ── Left: Keyword list ── */}
        <div className="space-y-4">
          {/* Cawarden page matcher */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-[#00ff88]">Your landing page</p>
            <p className="text-[11px] text-[#484f58]">We'll compare this against whoever outranks you.</p>
            <input
              value={cawardenPage}
              onChange={(e) => setCawardenPage(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded-xl px-3 py-2 text-xs font-mono text-[#c9d1d9] focus:outline-none focus:border-[#00ff8840]"
              placeholder="https://cawardenreclaim.co.uk/..."
            />
          </div>

          {/* Custom search */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-[#484f58]">Custom search</p>
            <div className="flex gap-2">
              <input
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") search(customQuery); }}
                placeholder="type a term..."
                className="flex-1 bg-[#0d1117] border border-[#21262d] rounded-xl px-3 py-2 text-xs font-mono text-[#c9d1d9] focus:outline-none focus:border-[#00ff8840] placeholder:text-[#30363d]"
              />
              <button
                onClick={() => search(customQuery)}
                disabled={!customQuery.trim() || status === "loading"}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
                style={{ background: "#00ff8820", color: YOU_COLOR, border: "1px solid #00ff8840" }}
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preset terms */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#21262d] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#484f58]" />
              <p className="text-xs font-bold text-[#c9d1d9]">James's Priority Terms</p>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {PRESET_KEYWORDS.map(({ category, terms }) => (
                <div key={category}>
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#484f58] bg-[#0d1117] border-b border-[#21262d]">
                    {category}
                  </p>
                  {terms.map((term) => {
                    const isActive = activeQuery === term;
                    return (
                      <button
                        key={term}
                        onClick={() => search(term)}
                        disabled={status === "loading"}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-xs transition-colors border-b border-[#21262d] last:border-0 hover:bg-[#0d1117] disabled:opacity-50"
                        style={{
                          background: isActive ? "#0d1117" : "transparent",
                          color: isActive ? YOU_COLOR : "#8b949e",
                        }}
                      >
                        {status === "loading" && isActive ? (
                          <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full shrink-0" />
                        ) : isActive ? (
                          <ChevronRight className="w-3 h-3 shrink-0" style={{ color: YOU_COLOR }} />
                        ) : (
                          <ChevronRight className="w-3 h-3 shrink-0 text-[#21262d]" />
                        )}
                        {term}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="space-y-4">

          {/* Status / no-config notice */}
          {status === "idle" && (
            <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
              <Search className="w-10 h-10 text-[#21262d]" />
              <div>
                <p className="text-sm font-bold text-[#c9d1d9]">Pick a keyword to start</p>
                <p className="text-xs text-[#484f58] mt-1 max-w-sm">
                  Click any term on the left to see who's ranking on Google UK for that search and what their pages contain.
                </p>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-10 flex flex-col items-center gap-4">
              <span className="animate-spin inline-block w-8 h-8 border-2 border-[#30363d] border-t-[#00ff88] rounded-full" />
              <p className="text-sm text-[#484f58]">Searching Google UK for <span className="font-mono text-[#c9d1d9]">"{activeQuery}"</span>…</p>
            </div>
          )}

          {status === "error" && (
            <div className="bg-[#1e0a0a] border border-[#ff7b7240] rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-2 text-sm text-[#ff7b72]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {errorMsg.includes("GOOGLE_CSE") && (
                <div className="text-xs text-[#8b949e] space-y-1.5 pl-6 border-l border-[#ff7b7230]">
                  <p className="font-bold text-[#c9d1d9]">Setup needed:</p>
                  <p>1. Go to <a href="https://cse.google.com/cse/all" target="_blank" rel="noopener noreferrer" className="underline text-[#79c0ff]">cse.google.com</a> → New Search Engine → Search the entire web → copy the <strong>Search Engine ID</strong></p>
                  <p>2. Enable <strong>Custom Search API</strong> in Google Cloud Console → APIs &amp; Services → Library</p>
                  <p>3. Add to <code className="bg-[#0d1117] px-1 py-0.5 rounded">.env.local</code>:</p>
                  <pre className="bg-[#0d1117] rounded-lg p-3 text-[#c9d1d9] font-mono text-[11px] overflow-x-auto">{`GOOGLE_CSE_ID="your_search_engine_id"\nGOOGLE_CSE_API_KEY="your_api_key"  # same key as PageSpeed`}</pre>
                  <p>4. Restart the dev server</p>
                </div>
              )}
            </div>
          )}

          {status === "done" && result && (
            <>
              {/* Result header */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1">
                  <p className="text-base font-bold text-[#e6edf3]">
                    &ldquo;{result.query}&rdquo;
                  </p>
                  <p className="text-xs text-[#484f58] mt-0.5">
                    ~{Number(result.totalResults).toLocaleString()} results · Google UK
                    {lastFetched && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {lastFetched}
                      </span>
                    )}
                  </p>
                </div>

                {/* Cawarden rank badge */}
                <div className={`px-4 py-2 rounded-xl border text-center min-w-[120px] ${
                  cawardenRank === null
                    ? "bg-[#1e0a0a] border-[#ff7b7240]"
                    : cawardenRank <= 3
                    ? "bg-[#0a1a12] border-[#00ff8840]"
                    : "bg-[#1a1200] border-[#e3b34140]"
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#484f58]">Cawarden</p>
                  <p className="text-xl font-black"
                    style={{ color: cawardenRank === null ? BAD_COLOR : cawardenRank <= 3 ? YOU_COLOR : WARN_COLOR }}>
                    {positionLabel(cawardenRank)}
                  </p>
                  <p className="text-[10px] text-[#484f58]">{cawardenRank === null ? "not ranking" : "on Google UK"}</p>
                </div>

                {notRanking && (
                  <div className="flex items-center gap-2 text-xs text-[#ff7b72] bg-[#1e0a0a] border border-[#ff7b7230] rounded-xl px-3 py-2">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    Cawarden isn&apos;t in the top 10 — content opportunity
                  </div>
                )}

                {cawardenRank && cawardenRank <= 3 && (
                  <div className="flex items-center gap-2 text-xs text-[#00ff88] bg-[#0a1a12] border border-[#00ff8830] rounded-xl px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Strong position — protect &amp; improve
                  </div>
                )}

                <button
                  onClick={() => search(activeQuery)}
                  className="flex items-center gap-1.5 text-xs text-[#484f58] hover:text-[#c9d1d9] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Not ranking call-to-action */}
              {notRanking && (
                <div className="bg-[#1a1200] border border-[#e3b34130] rounded-2xl p-4 flex items-start gap-3">
                  <Zap className="w-4 h-4 text-[#e3b341] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#e3b341]">Cawarden doesn&apos;t rank for this — high priority opportunity</p>
                    <p className="text-xs text-[#8b949e] mt-1">
                      Review what the top 3 pages below have in common. Click <strong className="text-[#3b82f6]">Analyse</strong> on each to compare their page structure, content depth, and schema against your landing page.
                    </p>
                  </div>
                </div>
              )}

              {/* Top 10 results */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#484f58] uppercase tracking-wide px-1">
                  Google UK Top 10
                </p>
                {result.results.map((r) => (
                  <ResultCard key={r.url} result={r} cawardenUrl={cawardenPage} />
                ))}
                {result.results.length === 0 && (
                  <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-8 text-center text-sm text-[#484f58]">
                    No results returned — check CSE is set to search the entire web.
                  </div>
                )}
              </div>

              {/* Competitor watchlist */}
              {result.results.length > 0 && (
                <CompetitorWatchlist results={result.results} />
              )}

              {/* Content intelligence */}
              {result.results.length > 0 && (
                <ContentIntel results={result.results} query={result.query} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
