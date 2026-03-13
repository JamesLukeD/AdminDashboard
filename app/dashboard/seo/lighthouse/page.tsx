"use client";

import { useState, useCallback } from "react";
import type { PageSpeedResult, PageSpeedStrategy, CWVMetric } from "@/app/api/page-speed/route";

// ── Pre-defined Cawarden pages ────────────────────────────────────────────────

const PRESET_PAGES = [
  { label: "Home", url: "https://cawardenreclaim.co.uk" },
  { label: "Bricks", url: "https://cawardenreclaim.co.uk/c/bricks/" },
  { label: "Roof Tiles", url: "https://cawardenreclaim.co.uk/c/roof-tiles-fittings/" },
  { label: "Stone", url: "https://cawardenreclaim.co.uk/c/stone-products/" },
  { label: "Flooring", url: "https://cawardenreclaim.co.uk/c/reclaimed-flooring/" },
  { label: "Contact", url: "https://cawardenreclaim.co.uk/contact/" },
];

// ── Score colour helpers ───────────────────────────────────────────────────────

function scoreColour(score: number): string {
  if (score >= 90) return "#00ff88";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function categoryColour(cat: CWVMetric["category"]): string {
  if (cat === "FAST") return "#00ff88";
  if (cat === "AVERAGE") return "#f59e0b";
  if (cat === "SLOW") return "#ef4444";
  return "#4b5563";
}

function categoryLabel(cat: CWVMetric["category"]): string {
  if (cat === "FAST") return "FAST";
  if (cat === "AVERAGE") return "AVG";
  if (cat === "SLOW") return "SLOW";
  return "N/A";
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const colour = scoreColour(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2d3d" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={colour} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-black font-mono" style={{ fontSize: size * 0.22, color: colour, lineHeight: 1 }}>{score}</span>
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: size * 0.08, color: "#6b7280" }}>score</span>
      </div>
    </div>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────────

function MetricRow({ name, metric, abbr }: { name: string; abbr: string; metric: CWVMetric }) {
  const colour = categoryColour(metric.category);
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid #0f1a24" }}>
      <span className="w-12 text-[10px] font-mono uppercase shrink-0" style={{ color: "#4b5563" }}>{abbr}</span>
      <span className="flex-1 text-xs" style={{ color: "#8b949e" }}>{name}</span>
      <span className="text-xs font-mono" style={{ color: "#e6edf3" }}>{metric.displayValue}</span>
      <span
        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
        style={{ background: `${colour}22`, color: colour, border: `1px solid ${colour}44` }}
      >
        {categoryLabel(metric.category)}
      </span>
    </div>
  );
}

// ── Opportunities ─────────────────────────────────────────────────────────────

function Opportunities({ opps }: { opps: PageSpeedStrategy["opportunities"] }) {
  if (!opps.length) {
    return (
      <p className="text-xs font-mono py-4 text-center" style={{ color: "#00ff88" }}>
        ✓ No major opportunities found
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {opps.map((o, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded" style={{ background: "#0a0e14", border: "1px solid #1e2d3d" }}>
          <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: "#f59e0b" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: "#c9d1d9" }}>{o.title}</p>
            {o.displayValue && (
              <p className="text-[11px] font-mono mt-0.5" style={{ color: "#6b7280" }}>{o.displayValue}</p>
            )}
          </div>
          {o.savingsMs > 0 && (
            <span className="text-[11px] font-mono shrink-0" style={{ color: "#f59e0b" }}>
              −{(o.savingsMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Strategy panel ────────────────────────────────────────────────────────────

function StrategyPanel({ data, label }: { data: PageSpeedStrategy; label: string }) {
  return (
    <div className="space-y-5">
      {/* Score + label */}
      <div className="flex flex-col items-center gap-2">
        <ScoreRing score={data.score} size={130} />
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#6b7280" }}>{label}</span>
      </div>

      {/* Core Web Vitals */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1e2d3d" }}>
        <div className="px-3 py-2" style={{ background: "#0a0e14", borderBottom: "1px solid #1e2d3d" }}>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#4b5563" }}>Core Web Vitals</span>
        </div>
        <div className="px-3 divide-y-0" style={{ background: "#060a0f" }}>
          <MetricRow abbr="FCP"  name="First Contentful Paint"  metric={data.fcp} />
          <MetricRow abbr="LCP"  name="Largest Contentful Paint" metric={data.lcp} />
          <MetricRow abbr="TBT"  name="Total Blocking Time"      metric={data.tbt} />
          <MetricRow abbr="CLS"  name="Cumulative Layout Shift"  metric={data.cls} />
          <MetricRow abbr="SI"   name="Speed Index"              metric={data.si} />
          <MetricRow abbr="TTFB" name="Time to First Byte"       metric={data.ttfb} />
        </div>
      </div>

      {/* Opportunities */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "#4b5563" }}>
          Opportunities
        </p>
        <Opportunities opps={data.opportunities} />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LighthousePage() {
  const [selectedUrl, setSelectedUrl] = useState(PRESET_PAGES[0].url);
  const [customUrl, setCustomUrl] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [data, setData] = useState<PageSpeedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUrl = useCustom ? customUrl : selectedUrl;

  const runAudit = useCallback(async (url?: string) => {
    const target = url ?? activeUrl;
    if (!target) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/page-speed?url=${encodeURIComponent(target)}&strategy=both`);
      const json: PageSpeedResult = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [activeUrl]);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "#e6edf3" }}>Page Speed</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          Google Lighthouse audit for cawardenreclaim.co.uk
        </p>
      </div>

      {/* URL picker */}
      <div className="rounded-lg p-4 space-y-3" style={{ background: "#0a0e14", border: "1px solid #1e2d3d" }}>
        {/* Preset pills */}
        <div className="flex flex-wrap gap-2">
          {PRESET_PAGES.map((p) => (
            <button
              key={p.url}
              onClick={() => { setUseCustom(false); setSelectedUrl(p.url); }}
              className="px-3 py-1 rounded text-xs font-mono transition-all"
              style={{
                background: (!useCustom && selectedUrl === p.url) ? "#00ff8822" : "#060a0f",
                border: `1px solid ${(!useCustom && selectedUrl === p.url) ? "#00ff88" : "#1e2d3d"}`,
                color: (!useCustom && selectedUrl === p.url) ? "#00ff88" : "#6b7280",
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setUseCustom(true)}
            className="px-3 py-1 rounded text-xs font-mono transition-all"
            style={{
              background: useCustom ? "#00ff8822" : "#060a0f",
              border: `1px solid ${useCustom ? "#00ff88" : "#1e2d3d"}`,
              color: useCustom ? "#00ff88" : "#6b7280",
            }}
          >
            Custom URL
          </button>
        </div>

        {/* Custom URL input */}
        {useCustom && (
          <input
            type="url"
            placeholder="https://cawardenreclaim.co.uk/..."
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="w-full px-3 py-2 rounded text-xs font-mono outline-none"
            style={{ background: "#060a0f", border: "1px solid #1e2d3d", color: "#e6edf3" }}
          />
        )}

        {/* Active URL + Run */}
        <div className="flex items-center gap-3">
          <span className="flex-1 text-xs font-mono truncate" style={{ color: "#4b5563" }}>{activeUrl}</span>
          <button
            onClick={() => runAudit()}
            disabled={loading || !activeUrl}
            className="px-4 py-1.5 rounded text-xs font-mono font-bold transition-all disabled:opacity-50"
            style={{ background: "#00ff88", color: "#060a0f" }}
          >
            {loading ? "Analysing…" : "Run Audit"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded p-3 text-xs font-mono" style={{ background: "#ef444422", border: "1px solid #ef4444", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg p-6 space-y-4 animate-pulse" style={{ background: "#0a0e14", border: "1px solid #1e2d3d" }}>
              <div className="mx-auto w-32 h-32 rounded-full" style={{ background: "#1e2d3d" }} />
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-3 rounded" style={{ background: "#1e2d3d", width: `${70 + (j % 3) * 10}%` }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {data.cachedAt && (
            <p className="text-[10px] font-mono text-right" style={{ color: "#4b5563" }}>
              cached · {new Date(data.cachedAt).toLocaleTimeString()}
            </p>
          )}

          {/* Always side-by-side mobile + desktop */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg p-5" style={{ background: "#0a0e14", border: "1px solid #1e2d3d" }}>
              <StrategyPanel data={data.mobile} label="Mobile" />
            </div>
            <div className="rounded-lg p-5" style={{ background: "#0a0e14", border: "1px solid #1e2d3d" }}>
              <StrategyPanel data={data.desktop ?? data.mobile} label="Desktop" />
            </div>
          </div>

          {/* Field data */}
          {data.fieldData && (
            <div className="rounded-lg p-4" style={{ background: "#0a0e14", border: "1px solid #1e2d3d" }}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "#4b5563" }}>
                Chrome User Experience Report (28-day field data)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    { abbr: "LCP", metric: data.fieldData.lcp, name: "Largest Contentful Paint" },
                    { abbr: "FID", metric: data.fieldData.fid, name: "First Input Delay" },
                    { abbr: "CLS", metric: data.fieldData.cls, name: "Cumulative Layout Shift" },
                    { abbr: "FCP", metric: data.fieldData.fcp, name: "First Contentful Paint" },
                    ...(data.fieldData.inp ? [{ abbr: "INP", metric: data.fieldData.inp, name: "Interaction to Next Paint" }] : []),
                  ] as { abbr: string; metric: CWVMetric; name: string }[]
                ).map(({ abbr, metric, name }) => {
                  const colour = categoryColour(metric.category);
                  return (
                    <div key={abbr} className="rounded p-3 text-center" style={{ background: "#060a0f", border: `1px solid ${colour}33` }}>
                      <p className="text-[10px] font-mono uppercase mb-1" style={{ color: "#4b5563" }}>{abbr}</p>
                      <p className="text-sm font-mono font-bold" style={{ color: colour }}>{metric.displayValue}</p>
                      <p className="text-[9px] mt-1" style={{ color: "#4b5563" }}>{name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="rounded-lg p-12 text-center" style={{ background: "#0a0e14", border: "1px dashed #1e2d3d" }}>
          <p className="text-sm" style={{ color: "#4b5563" }}>Select a page above and click <strong style={{ color: "#00ff88" }}>Run Audit</strong></p>
          <p className="text-xs mt-1 font-mono" style={{ color: "#1e2d3d" }}>Powered by Google PageSpeed Insights · results cached 1 hour</p>
        </div>
      )}
    </div>
  );
}
