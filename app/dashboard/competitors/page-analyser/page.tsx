"use client";

import { useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  Globe, FileText, Heading1, Image, Link2,
  Code2, Share2, Trophy, Zap, Star,
  Camera, Columns2, SplitSquareHorizontal, ExternalLink, Gauge,
} from "lucide-react";
import type { PageAnalysis, ScoreBreakdown, KeywordAnalysis } from "@/app/api/page-analyser/route";
import type { PageSpeedResult } from "@/app/api/page-speed/route";

const YOU_COLOR  = "#00ff88";
const THEM_COLOR = "#3b82f6";
const BASE_MAX   = 100; // 25+20+20+20+10+5

type Status = "idle" | "loading" | "done" | "error";
type SnapStatus = "idle" | "loading" | "done" | "error";
type PerfStatus = "idle" | "loading" | "done" | "error";
type ViewMode = "sidebyside" | "overlay";

interface SnapResult {
  screenshot: string;
  error?: string;
}

// ── Score helpers ────────────────────────────────────────────────────────────

const BASE_SCORE_CATS: { key: keyof ScoreBreakdown; label: string; max: number }[] = [
  { key: "meta",     label: "Meta SEO",    max: 25 },
  { key: "headings", label: "Headings",    max: 20 },
  { key: "content",  label: "Content",     max: 20 },
  { key: "schema",   label: "Schema",      max: 20 },
  { key: "images",   label: "Images",      max: 10 },
  { key: "links",    label: "Links",       max:  5 },
];

const KEYWORD_CAT: { key: keyof ScoreBreakdown; label: string; max: number } =
  { key: "keyword", label: "Keyword SEO", max: 20 };

function getScoreCats(hasKeyword: boolean) {
  return hasKeyword ? [...BASE_SCORE_CATS, KEYWORD_CAT] : BASE_SCORE_CATS;
}

function scoreGrade(n: number): { grade: string; color: string } {
  if (n >= 85) return { grade: "A+", color: "#00ff88" };
  if (n >= 70) return { grade: "A",  color: "#56d364" };
  if (n >= 55) return { grade: "B",  color: "#e3b341" };
  if (n >= 40) return { grade: "C",  color: "#f97316" };
  return              { grade: "D",  color: "#ff7b72" };
}

// ── Visual Comparison ──────────────────────────────────────────────────────

function VisualComparison({
  youSnap, themSnap, snapStatus, yourUrl, theirUrl,
}: {
  youSnap: SnapResult | null;
  themSnap: SnapResult | null;
  snapStatus: SnapStatus;
  yourUrl: string;
  theirUrl: string;
}) {
  const [mode, setMode] = useState<ViewMode>("sidebyside");
  const [sliderPct, setSliderPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderPct(pct);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
    setSliderPct(pct);
  }, []);

  const loading = snapStatus === "loading";
  const hostYou  = (() => { try { return new URL(yourUrl).hostname; } catch { return yourUrl; } })();
  const hostThem = (() => { try { return new URL(theirUrl).hostname; } catch { return theirUrl; } })();

  return (
    <div className="bg-[#0d1117] rounded-2xl border border-[#21262d] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#21262d] flex items-center gap-3">
        <Camera className="w-4 h-4 text-[#484f58]" />
        <h2 className="font-bold text-[#e6edf3] text-sm">Visual Comparison</h2>
        {loading && (
          <span className="flex items-center gap-1.5 text-xs font-mono text-[#484f58]">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-[#484f58] border-t-transparent rounded-full" />
            Capturing screenshots…
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setMode("sidebyside")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              mode === "sidebyside"
                ? "border-[#00ff8840] text-[#00ff88] bg-[#00ff8810]"
                : "border-[#21262d] text-[#484f58] hover:text-[#8b949e]"
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" /> Side by side
          </button>
          <button
            onClick={() => setMode("overlay")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              mode === "overlay"
                ? "border-[#3b82f640] text-[#79c0ff] bg-[#3b82f610]"
                : "border-[#21262d] text-[#484f58] hover:text-[#8b949e]"
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" /> Overlay
          </button>
        </div>
      </div>

      {mode === "sidebyside" ? (
        <div className="grid grid-cols-2 divide-x divide-[#21262d]">
          {[{ snap: youSnap, color: YOU_COLOR, label: "Your Page", host: hostYou, url: yourUrl },
            { snap: themSnap, color: THEM_COLOR, label: "Competitor", host: hostThem, url: theirUrl }].map(({ snap, color, label, host, url }) => (
            <div key={label} className="relative">
              <div className="px-3 py-2 flex items-center gap-1.5 border-b border-[#21262d]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-xs font-bold truncate" style={{ color }}>{label}</span>
                <span className="text-[10px] text-[#484f58] truncate ml-1">{host}</span>
                <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[#30363d] hover:text-[#484f58]">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="bg-[#0a0e14] aspect-[16/10] flex items-center justify-center overflow-hidden">
                {snap?.screenshot ? (
                  <img src={snap.screenshot} alt={label} className="w-full h-full object-cover object-top" />
                ) : snap?.error ? (
                  <div className="text-center p-4"><AlertTriangle className="w-6 h-6 text-[#ff7b72] mx-auto mb-2" /><p className="text-xs text-[#ff7b72]">{snap.error}</p></div>
                ) : loading ? (
                  <div className="text-center"><span className="animate-spin inline-block w-8 h-8 border-2 border-[#30363d] border-t-[#484f58] rounded-full" /></div>
                ) : (
                  <div className="text-center"><Camera className="w-10 h-10 text-[#21262d] mx-auto mb-2" /><p className="text-xs text-[#30363d]">No screenshot</p></div>
                )}
              </div>
              {snap?.screenshot && (
                <div className="absolute bottom-2 right-2">
                  <a href={snap.screenshot} download={`${label.replace(/ /g,"-")}.jpg`} className="text-[10px] px-2 py-1 rounded-lg bg-[#161b22] border border-[#21262d] text-[#484f58] hover:text-[#8b949e] transition-colors">
                    Save
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Overlay / slider mode
        <div className="p-4 space-y-3">
          <p className="text-xs text-[#484f58] font-mono text-center">Drag the divider to reveal each page · <span style={{ color: YOU_COLOR }}>◀ Your Page</span> vs <span style={{ color: THEM_COLOR }}>Competitor ▶</span></p>
          {youSnap?.screenshot && themSnap?.screenshot ? (
            <div
              ref={containerRef}
              className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[#21262d] cursor-col-resize select-none"
              onMouseMove={onMouseMove}
              onMouseUp={() => { dragging.current = false; }}
              onMouseLeave={() => { dragging.current = false; }}
              onTouchMove={onTouchMove}
              onTouchEnd={() => { dragging.current = false; }}
            >
              {/* Left image (yours) */}
              <img src={youSnap.screenshot} alt="Your page" className="absolute inset-0 w-full h-full object-cover object-top" />
              {/* Right image (theirs) clipped */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${sliderPct}%)` }}
              >
                <img src={themSnap.screenshot} alt="Competitor" className="absolute inset-0 w-full h-full object-cover object-top" />
              </div>
              {/* Divider line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 z-10"
                style={{ left: `${sliderPct}%`, background: "white", boxShadow: "0 0 8px rgba(0,0,0,0.8)" }}
              />
              {/* Drag handle */}
              <div
                className="absolute top-1/2 z-20 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xl cursor-col-resize"
                style={{ left: `${sliderPct}%` }}
                onMouseDown={() => { dragging.current = true; }}
                onTouchStart={() => { dragging.current = true; }}
              >
                <SplitSquareHorizontal className="w-4 h-4 text-[#0a0e14]" />
              </div>
              {/* Labels */}
              <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: YOU_COLOR + "cc", color: "#0a0e14" }}>YOUR PAGE</div>
              <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: THEM_COLOR + "cc", color: "white" }}>COMPETITOR</div>
            </div>
          ) : loading ? (
            <div className="aspect-[16/10] flex items-center justify-center bg-[#0a0e14] rounded-xl border border-[#21262d]">
              <div className="text-center space-y-3">
                <span className="animate-spin inline-block w-10 h-10 border-2 border-[#30363d] border-t-[#484f58] rounded-full" />
                <p className="text-xs text-[#484f58] font-mono">Capturing screenshots…</p>
              </div>
            </div>
          ) : (
            <div className="aspect-[16/10] flex items-center justify-center bg-[#0a0e14] rounded-xl border border-[#21262d]">
              <p className="text-xs text-[#30363d]">Run an analysis to see screenshot comparison</p>
            </div>
          )}
          {/* Slider input */}
          {youSnap?.screenshot && themSnap?.screenshot && (
            <input
              type="range" min={2} max={98} value={sliderPct}
              onChange={(e) => setSliderPct(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-col-resize"
              style={{ accentColor: "white" }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Scoreboard ───────────────────────────────────────────────────────────────

function Scoreboard({ yours, theirs, scoreCats, maxScore, yourRank, theirRank }: {
  yours: PageAnalysis;
  theirs: PageAnalysis;
  scoreCats: { key: keyof ScoreBreakdown; label: string; max: number }[];
  maxScore: number;
  yourRank?: number | null;
  theirRank?: number | null;
}) {
  const youTotal  = yours.totalScore;
  const themTotal = theirs.totalScore;
  const youLeads  = youTotal >= themTotal;
  const diff      = Math.abs(youTotal - themTotal);
  const youGrade  = scoreGrade(youTotal);
  const themGrade = scoreGrade(themTotal);

  // Detect the "score misleads" scenario: you score higher on-page but rank worse
  const ranksProvided = yourRank != null && theirRank != null;
  const scoreMisleads = ranksProvided && youTotal >= themTotal && yourRank > theirRank;

  return (
    <div className="bg-[#0d1117] rounded-2xl border border-[#21262d] overflow-hidden">
      {/* Disclaimer */}
      <div className="px-5 pt-4 pb-3 border-b border-[#21262d] space-y-3">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-[#e3b341] shrink-0" />
          <h2 className="font-bold text-[#e6edf3] text-base">SEO Scoreboard</h2>
          <div className="ml-auto flex items-center gap-2">
            {diff === 0 ? (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#30363d] text-[#8b949e]">Tied</span>
            ) : (
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: youLeads ? "#00ff8820" : "#3b82f620", color: youLeads ? YOU_COLOR : THEM_COLOR }}>
                {youLeads ? "You lead" : "They lead"} by {diff} pts <span className="opacity-60 font-normal">on-page</span>
              </span>
            )}
          </div>
        </div>
        {/* Always-visible scope note */}
        <div className="flex items-start gap-2 bg-[#161b22] border border-[#21262d] rounded-xl px-3 py-2.5">
          <span className="text-[#e3b341] text-xs mt-px">ⓘ</span>
          <p className="text-xs text-[#6e7681] leading-relaxed">
            This score measures <span className="text-[#c9d1d9]">on-page HTML structure only</span> — meta tags, headings, content depth, schema markup, and internal links. It does <span className="text-[#c9d1d9]">not</span> factor in backlinks, domain authority, page speed, click-through rate, or user engagement signals.
          </p>
        </div>
        {/* Warning when score contradicts ranking */}
        {scoreMisleads && (
          <div className="flex items-start gap-2 bg-[#ff7b7210] border border-[#ff7b7240] rounded-xl px-3 py-2.5">
            <span className="text-[#ff7b72] text-sm mt-px">⚠</span>
            <div className="text-xs text-[#ff7b72] space-y-1 leading-relaxed">
              <p className="font-semibold">On-page score doesn't match actual rankings</p>
              <p className="text-[#ff7b7299]">
                Your HTML structure scores higher, but you rank #{yourRank} vs their #{theirRank}. Google is weighting off-page factors — backlinks, domain authority, and engagement signals — more heavily than on-page structure for this keyword. Improving on-page signals is still useful, but it won't close this gap alone.
              </p>
            </div>
          </div>
        )}
        {/* Rank badges when provided */}
        {ranksProvided && !scoreMisleads && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#484f58]">Google positions:</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg" style={{ background: "#00ff8815", color: YOU_COLOR }}>#{yourRank} You</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg" style={{ background: "#3b82f615", color: THEM_COLOR }}>#{theirRank} Them</span>
          </div>
        )}
      </div>

      {/* Big score row */}
      <div className="grid grid-cols-3 divide-x divide-[#21262d]">
        <div className="p-5 text-center space-y-1">
          <p className="text-xs font-semibold text-[#484f58] uppercase tracking-wide truncate">Your Page</p>
          <p className="text-5xl font-black tabular-nums" style={{ color: YOU_COLOR }}>{youTotal}</p>
          <p className="text-sm font-bold" style={{ color: youGrade.color }}>{youGrade.grade}</p>
          <p className="text-xs text-[#484f58]">out of {maxScore}</p>
        </div>
        <div className="p-5 flex flex-col items-center justify-center gap-2">
          <div className="relative w-full h-3 rounded-full bg-[#161b22] overflow-hidden">
            <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${(youTotal / maxScore) * 100}%`, background: YOU_COLOR }} />
          </div>
          <div className="text-xs font-mono text-[#484f58] text-center">
            {youTotal > themTotal && <span style={{ color: YOU_COLOR }}>+{diff}</span>}
            {youTotal < themTotal && <span style={{ color: THEM_COLOR }}>-{diff}</span>}
            {youTotal === themTotal && <span className="text-[#6e7681]">=</span>}
          </div>
          <div className="relative w-full h-3 rounded-full bg-[#161b22] overflow-hidden">
            <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${(themTotal / maxScore) * 100}%`, background: THEM_COLOR }} />
          </div>
        </div>
        <div className="p-5 text-center space-y-1">
          <p className="text-xs font-semibold text-[#484f58] uppercase tracking-wide truncate">Competitor</p>
          <p className="text-5xl font-black tabular-nums" style={{ color: THEM_COLOR }}>{themTotal}</p>
          <p className="text-sm font-bold" style={{ color: themGrade.color }}>{themGrade.grade}</p>
          <p className="text-xs text-[#484f58]">out of {maxScore}</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="border-t border-[#21262d] px-5 py-4 space-y-3">
        {scoreCats.map(({ key, label, max }) => {
          const yv = yours.scores[key];
          const tv = theirs.scores[key];
          const youWin   = yv > tv;
          const themWin  = tv > yv;
          return (
            <div key={key} className="grid grid-cols-[1fr_80px_1fr] gap-3 items-center">
              {/* You bar */}
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs font-mono font-bold text-right" style={{ color: youWin ? YOU_COLOR : "#6e7681", minWidth: 28 }}>{yv}/{max}</span>
                <div className="flex-1 h-2 rounded-full bg-[#161b22] overflow-hidden flex justify-end">
                  <div className="h-full rounded-full" style={{ width: `${(yv / max) * 100}%`, background: youWin ? YOU_COLOR : "#374151" }} />
                </div>
              </div>
              {/* Label */}
              <div className="text-center">
                <p className="text-xs text-[#484f58] font-semibold leading-tight">{label}</p>
                {youWin  && <span className="text-[9px] font-bold px-1 rounded" style={{ background: "#00ff8820", color: YOU_COLOR }}>YOU WIN</span>}
                {themWin && <span className="text-[9px] font-bold px-1 rounded" style={{ background: "#3b82f620", color: THEM_COLOR }}>THEY WIN</span>}
                {!youWin && !themWin && <span className="text-[9px] text-[#30363d]">TIED</span>}
              </div>
              {/* Them bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-[#161b22] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(tv / max) * 100}%`, background: themWin ? THEM_COLOR : "#374151" }} />
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: themWin ? THEM_COLOR : "#6e7681", minWidth: 28 }}>{tv}/{max}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick wins panel ──────────────────────────────────────────────────────────

function QuickWins({ yours, theirs }: { yours: PageAnalysis; theirs: PageAnalysis }) {
  const gaps: { priority: "high" | "medium" | "low"; text: string }[] = [];

  // High priority
  if (!yours.title && theirs.title) gaps.push({ priority: "high", text: "Add a <title> tag" });
  if (!yours.metaDescription && theirs.metaDescription) gaps.push({ priority: "high", text: "Add a meta description" });
  if (yours.h1s.length === 0 && theirs.h1s.length > 0) gaps.push({ priority: "high", text: "Add an H1 heading" });
  if (yours.scores.schema === 0 && theirs.scores.schema > 0) gaps.push({ priority: "high", text: `Add schema markup — they have: ${theirs.schemaTypes.slice(0, 3).join(", ")}` });
  if (!yours.hasFaq && theirs.hasFaq) gaps.push({ priority: "high", text: "Add FAQ schema — competitor has FAQPage markup (big SERP feature)" });

  // Medium
  if (yours.h1s.length > 1) gaps.push({ priority: "medium", text: `Reduce to a single H1 (you have ${yours.h1s.length})` });
  if (yours.wordCount < theirs.wordCount * 0.75) gaps.push({ priority: "medium", text: `Increase word count — you have ${yours.wordCount.toLocaleString()} vs their ${theirs.wordCount.toLocaleString()} words` });
  if (!yours.canonical && theirs.canonical) gaps.push({ priority: "medium", text: "Add a canonical tag" });
  if (!yours.ogTags["image"] && theirs.ogTags["image"]) gaps.push({ priority: "medium", text: "Add an og:image for social sharing" });
  if (!yours.hasBreadcrumb && theirs.hasBreadcrumb) gaps.push({ priority: "medium", text: "Add BreadcrumbList schema" });
  if (yours.h2s.length < theirs.h2s.length) gaps.push({ priority: "medium", text: `Add more H2 subheadings (you: ${yours.h2s.length}, them: ${theirs.h2s.length})` });
  if (yours.bulletListCount < theirs.bulletListCount) gaps.push({ priority: "medium", text: `Add more bullet-point lists (you: ${yours.bulletListCount}, them: ${theirs.bulletListCount})` });
  if (!yours.hasVideo && theirs.hasVideo) gaps.push({ priority: "medium", text: "Add a video embed to this page" });

  // Low
  if (yours.imagesWithAlt < yours.imageCount) gaps.push({ priority: "low", text: `Add alt text to ${yours.imageCount - yours.imagesWithAlt} image(s)` });
  if (!yours.lang && theirs.lang) gaps.push({ priority: "low", text: "Set the lang attribute on <html>" });
  if (yours.tableCount < theirs.tableCount) gaps.push({ priority: "low", text: `Add comparison table(s) (they have ${theirs.tableCount})` });

  // Keyword-specific gaps
  const ky = yours.keywordAnalysis;
  const kt = theirs.keywordAnalysis;
  if (ky) {
    if (!ky.inTitle)           gaps.push({ priority: "high",   text: `Include "${ky.keyword}" in the page title` });
    if (!ky.inH1)              gaps.push({ priority: "high",   text: `Include "${ky.keyword}" in the H1 heading` });
    if (!ky.inMetaDesc)        gaps.push({ priority: "medium", text: `Include "${ky.keyword}" in the meta description` });
    if (!ky.inH2 && theirs.h2s.length > 0) gaps.push({ priority: "medium", text: `Include "${ky.keyword}" in at least one H2 subheading` });
    if (ky.densityStatus === "low")  gaps.push({ priority: "medium", text: `Keyword density too low (${ky.densityPct}%) — aim for 0.5–2.5%` });
    if (ky.densityStatus === "high") gaps.push({ priority: "medium", text: `Keyword stuffing detected (${ky.densityPct}%) — reduce to under 2.5%` });
    if (!ky.firstParagraphHas)       gaps.push({ priority: "low",    text: `Use "${ky.keyword}" in the first paragraph` });
    if (!ky.inAltText && yours.imageCount > 0) gaps.push({ priority: "low", text: `Include "${ky.keyword}" in at least one image alt attribute` });
    if (kt && ky.occurrences < kt.occurrences) gaps.push({ priority: "low", text: `Competitor uses keyword ${kt.occurrences}× vs your ${ky.occurrences}× — consider more coverage` });
  }

  if (gaps.length === 0) return (
    <div className="bg-[#0a1a12] border border-[#00ff8830] rounded-2xl p-5 flex items-center gap-3">
      <Star className="w-5 h-5 text-[#00ff88]" />
      <div>
        <p className="font-bold text-[#00ff88] text-sm">Excellent — no obvious gaps found</p>
        <p className="text-xs text-[#56d364] mt-0.5">Your page covers all the areas where the competitor has an advantage.</p>
      </div>
    </div>
  );

  const colorMap = { high: "#ff7b72", medium: "#e3b341", low: "#56d364" };
  const bgMap    = { high: "#1e0a0a", medium: "#1a1200", low: "#0a1a12" };
  const borderMap = { high: "#ff7b7230", medium: "#e3b34130", low: "#56d36430" };

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#21262d] flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#e3b341]" />
        <h3 className="font-bold text-sm text-[#e6edf3]">Quick Wins for Your Page</h3>
        <span className="ml-auto text-xs text-[#484f58]">{gaps.length} action{gaps.length !== 1 ? "s" : ""} found</span>
      </div>
      <div className="p-4 space-y-2">
        {(["high", "medium", "low"] as const).map((priority) => {
          const items = gaps.filter((g) => g.priority === priority);
          if (!items.length) return null;
          return (
            <div key={priority}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: colorMap[priority] }}>{priority} priority</p>
              <div className="space-y-1.5">
                {items.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl border text-xs" style={{ background: bgMap[priority], borderColor: borderMap[priority] }}>
                    <span className="font-bold mt-0.5 shrink-0" style={{ color: colorMap[priority] }}>→</span>
                    <span className="text-[#c9d1d9]">{g.text}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Keyword Optimisation ─────────────────────────────────────────────────────

function KwSignal({ label, you, them }: { label: string; you: boolean; them: boolean }) {
  return (
    <tr className="border-t border-[#21262d] hover:bg-[#0d1117] transition-colors">
      <td className="px-4 py-2.5 text-xs text-[#484f58] font-semibold w-48 shrink-0">{label}</td>
      <td className="px-4 py-2.5">
        {you ? <CheckCircle2 className="w-4 h-4 text-[#56d364]" /> : <XCircle className="w-4 h-4 text-[#484f58]" />}
      </td>
      <td className="px-4 py-2.5">
        {them ? <CheckCircle2 className="w-4 h-4 text-[#56d364]" /> : <XCircle className="w-4 h-4 text-[#484f58]" />}
      </td>
    </tr>
  );
}

function KeywordOptimisation({ yours, theirs }: { yours: KeywordAnalysis; theirs: KeywordAnalysis }) {
  const kwScore = (ka: KeywordAnalysis) => {
    let s = 0;
    if (ka.inTitle) s += 5; if (ka.inH1) s += 5; if (ka.inMetaDesc) s += 3;
    if (ka.inUrl) s += 2; if (ka.inH2) s += 2; if (ka.firstParagraphHas) s += 1;
    if (ka.inAltText) s += 1; if (ka.densityStatus === "good") s += 3;
    else if (ka.densityStatus === "low" && ka.occurrences > 0) s += 1;
    return Math.min(20, s);
  };
  const ys = kwScore(yours), ts = kwScore(theirs);

  const densityColor = (d: KeywordAnalysis["densityStatus"]) =>
    d === "good" ? "#56d364" : d === "high" ? "#ff7b72" : "#e3b341";

  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#21262d] bg-[#0d1117]">
        <Search className="w-4 h-4 text-[#484f58]" />
        <h3 className="text-sm font-bold text-[#c9d1d9]">Keyword Optimisation — <span className="font-mono" style={{ color: "#00ff88" }}>{yours.keyword}</span></h3>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-mono font-bold" style={{ color: ys >= ts ? YOU_COLOR : "#484f58" }}>You: {ys}/20</span>
          <span className="text-xs font-mono font-bold" style={{ color: ts > ys ? THEM_COLOR : "#484f58" }}>Them: {ts}/20</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#21262d]">
              <th className="px-4 py-2 text-xs text-left text-[#30363d] w-48" />
              <th className="px-4 py-2 text-xs text-left font-bold" style={{ color: YOU_COLOR }}>Your Page</th>
              <th className="px-4 py-2 text-xs text-left font-bold" style={{ color: THEM_COLOR }}>Competitor</th>
            </tr>
          </thead>
          <tbody>
            <KwSignal label="In page title"       you={yours.inTitle}           them={theirs.inTitle} />
            <KwSignal label="In H1 heading"        you={yours.inH1}              them={theirs.inH1} />
            <KwSignal label="In meta description"  you={yours.inMetaDesc}        them={theirs.inMetaDesc} />
            <KwSignal label="In H2 subheading"     you={yours.inH2}              them={theirs.inH2} />
            <KwSignal label="In H3 subheading"     you={yours.inH3}              them={theirs.inH3} />
            <KwSignal label="In URL slug"          you={yours.inUrl}             them={theirs.inUrl} />
            <KwSignal label="In first paragraph"   you={yours.firstParagraphHas} them={theirs.firstParagraphHas} />
            <KwSignal label="In image alt text"    you={yours.inAltText}         them={theirs.inAltText} />
            <tr className="border-t border-[#21262d]">
              <td className="px-4 py-2.5 text-xs text-[#484f58] font-semibold">Occurrences</td>
              <td className="px-4 py-2.5 text-xs font-mono" style={{ color: yours.occurrences >= theirs.occurrences ? YOU_COLOR : "#8b949e" }}>{yours.occurrences}</td>
              <td className="px-4 py-2.5 text-xs font-mono" style={{ color: theirs.occurrences > yours.occurrences ? THEM_COLOR : "#8b949e" }}>{theirs.occurrences}</td>
            </tr>
            <tr className="border-t border-[#21262d]">
              <td className="px-4 py-2.5 text-xs text-[#484f58] font-semibold">Density</td>
              <td className="px-4 py-2.5 text-xs font-mono" style={{ color: densityColor(yours.densityStatus) }}>{yours.densityPct}% <span className="opacity-60">({yours.densityStatus})</span></td>
              <td className="px-4 py-2.5 text-xs font-mono" style={{ color: densityColor(theirs.densityStatus) }}>{theirs.densityPct}% <span className="opacity-60">({theirs.densityStatus})</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Performance / Core Web Vitals ────────────────────────────────────────────

function perfGrade(score: number) {
  if (score >= 90) return { label: "Good",         color: "#56d364" };
  if (score >= 50) return { label: "Needs Work",   color: "#e3b341" };
  return               { label: "Poor",            color: "#ff7b72" };
}

function metricColor(n: number, thresholds: [number, number]) {
  if (n <= thresholds[0]) return "#56d364"; // good
  if (n <= thresholds[1]) return "#e3b341"; // needs improvement
  return "#ff7b72";                          // poor
}

// rough ms thresholds: [good_max, average_max]
const THRESHOLDS: Record<string, [number, number]> = {
  fcp:  [1800,  3000],
  lcp:  [2500,  4000],
  tbt:  [200,   600],
  cls:  [0.1,   0.25],  // values are ×1000 from API (numericValue)
  si:   [3400,  5800],
  ttfb: [800,   1800],
};

function MetricRow({ label, metricKey, yours, theirs }: { label: string; metricKey: string; yours: { displayValue: string; numericValue: number }; theirs: { displayValue: string; numericValue: number } }) {
  const th = THRESHOLDS[metricKey] ?? [Infinity, Infinity];
  const yc = metricColor(yours.numericValue, th);
  const tc = metricColor(theirs.numericValue, th);
  const youWins  = yours.numericValue > 0 && yours.numericValue < theirs.numericValue;
  const themWins = theirs.numericValue > 0 && theirs.numericValue < yours.numericValue;
  return (
    <tr className="border-t border-[#21262d] hover:bg-[#0d1117] transition-colors">
      <td className="px-4 py-2.5 text-xs text-[#484f58] font-semibold w-40">{label}</td>
      <td className="px-4 py-2.5 text-xs font-mono font-bold" style={{ color: yc }}>
        {yours.displayValue || "—"}
        {youWins && <span className="ml-1.5 text-[9px] px-1 rounded font-bold" style={{ background: "#00ff8820", color: YOU_COLOR }}>FASTER</span>}
      </td>
      <td className="px-4 py-2.5 text-xs font-mono font-bold" style={{ color: tc }}>
        {theirs.displayValue || "—"}
        {themWins && <span className="ml-1.5 text-[9px] px-1 rounded font-bold" style={{ background: "#3b82f620", color: THEM_COLOR }}>FASTER</span>}
      </td>
    </tr>
  );
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const { color } = perfGrade(score);
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#21262d" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

function PerformanceCard({ yours, theirs, status, onRun }: {
  yours: PageSpeedResult | null;
  theirs: PageSpeedResult | null;
  status: PerfStatus;
  onRun: (includeDesktop: boolean) => void;
}) {
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  const loading = status === "loading";

  if (status === "idle") return null;

  const ys = strategy === "desktop" ? yours?.desktop : yours?.mobile;
  const ts = strategy === "desktop" ? theirs?.desktop : theirs?.mobile;
  const desktopMissing = strategy === "desktop" && !ys && status === "done";

  const youScore  = ys?.score  ?? 0;
  const themScore = ts?.score  ?? 0;
  const diff = Math.abs(youScore - themScore);
  const youLeads = youScore >= themScore;

  const metrics: { label: string; key: keyof typeof THRESHOLDS }[] = [
    { label: "First Contentful Paint", key: "fcp" },
    { label: "Largest Contentful Paint", key: "lcp" },
    { label: "Total Blocking Time", key: "tbt" },
    { label: "Cumulative Layout Shift", key: "cls" },
    { label: "Speed Index", key: "si" },
    { label: "Server Response (TTFB)", key: "ttfb" },
  ];

  // Merged opportunities (those where you lose)
  const yourOpps = ys?.opportunities ?? [];
  const themOpps = ts?.opportunities ?? [];

  return (
    <div className="bg-[#0d1117] rounded-2xl border border-[#21262d] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#21262d] flex items-center gap-3">
        <Gauge className="w-5 h-5 text-[#3b82f6]" />
        <h2 className="font-bold text-[#e6edf3] text-base">Page Speed &amp; Core Web Vitals</h2>
        {loading && <span className="ml-2 animate-spin inline-block w-4 h-4 border-2 border-[#30363d] border-t-[#484f58] rounded-full" />}
        {!loading && yours?.cachedAt && (
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full border border-[#30363d] text-[#484f58]">cached</span>
        )}
        {/* Strategy toggle */}
        <div className="ml-auto flex items-center gap-0 border border-[#21262d] rounded-lg overflow-hidden text-xs">
          {(["mobile", "desktop"] as const).map((s) => (
            <button key={s} onClick={() => setStrategy(s)}
              className="px-3 py-1.5 font-semibold capitalize transition-colors"
              style={{ background: strategy === s ? "#00ff8820" : "transparent", color: strategy === s ? YOU_COLOR : "#484f58" }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center gap-3 text-sm text-[#484f58]">
          <span className="animate-spin inline-block w-5 h-5 border-2 border-[#30363d] border-t-[#484f58] rounded-full" />
          Running PageSpeed Insights… (may take 20–30s)
        </div>
      ) : yours?.error && theirs?.error ? (
        <div className="p-5 flex items-start gap-2 text-sm text-[#ff7b72]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{yours.error}</span>
        </div>
      ) : desktopMissing ? (
        <div className="p-8 flex flex-col items-center gap-3">
          <p className="text-sm text-[#484f58]">Desktop data wasn&apos;t fetched in the initial test.</p>
          <button onClick={() => onRun(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-[#21262d] text-[#c9d1d9] hover:border-[#00ff8840] hover:text-[#00ff88] transition-colors">
            Fetch Desktop Results <span className="text-[#484f58] font-normal">(2 quota calls)</span>
          </button>
        </div>
      ) : (
        <>
          {/* Score overview */}
          <div className="grid grid-cols-3 divide-x divide-[#21262d]">
            <div className="p-5 flex flex-col items-center gap-2">
              <div className="relative">
                <ScoreRing score={youScore} size={72} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-black tabular-nums" style={{ color: perfGrade(youScore).color }}>{youScore}</span>
                </div>
              </div>
              <p className="text-xs font-bold" style={{ color: YOU_COLOR }}>Your Page</p>
              <p className="text-xs font-semibold" style={{ color: perfGrade(youScore).color }}>{perfGrade(youScore).label}</p>
            </div>
            <div className="p-5 flex flex-col items-center justify-center gap-1.5">
              {diff === 0 ? (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#30363d] text-[#8b949e]">Tied</span>
              ) : (
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: youLeads ? "#00ff8820" : "#3b82f620", color: youLeads ? YOU_COLOR : THEM_COLOR }}>
                  {youLeads ? "You lead" : "They lead"} by {diff} pts
                </span>
              )}
              <p className="text-[10px] text-[#30363d] mt-1">{strategy} score</p>
            </div>
            <div className="p-5 flex flex-col items-center gap-2">
              <div className="relative">
                <ScoreRing score={themScore} size={72} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-black tabular-nums" style={{ color: perfGrade(themScore).color }}>{themScore}</span>
                </div>
              </div>
              <p className="text-xs font-bold" style={{ color: THEM_COLOR }}>Competitor</p>
              <p className="text-xs font-semibold" style={{ color: perfGrade(themScore).color }}>{perfGrade(themScore).label}</p>
            </div>
          </div>

          {/* CWV table */}
          {ys && ts && (
            <div className="border-t border-[#21262d] overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#21262d]">
                    <th className="px-4 py-2 text-xs text-left text-[#30363d] w-40" />
                    <th className="px-4 py-2 text-xs text-left font-bold" style={{ color: YOU_COLOR }}>Your Page</th>
                    <th className="px-4 py-2 text-xs text-left font-bold" style={{ color: THEM_COLOR }}>Competitor</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(({ label, key }) => {
                    type StratKey = "fcp" | "lcp" | "tbt" | "cls" | "si" | "ttfb";
                    const sk = key as StratKey;
                    return (
                      <MetricRow key={key} label={label} metricKey={key} yours={ys[sk]} theirs={ts[sk]} />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Your opportunities */}
          {yourOpps.length > 0 && (
            <div className="border-t border-[#21262d] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#e3b341] mb-2">Your page — top speed opportunities</p>
              <div className="space-y-1.5">
                {yourOpps.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1200] border border-[#e3b34130] text-xs">
                    <span className="font-bold text-[#e3b341]">→</span>
                    <span className="flex-1 text-[#c9d1d9]">{o.title}</span>
                    {o.displayValue && <span className="font-mono text-[#e3b341] shrink-0">{o.displayValue}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitor opportunities (shown for context) */}
          {themOpps.length > 0 && yourOpps.length === 0 && (
            <div className="border-t border-[#21262d] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#484f58] mb-2">Competitor — speed opportunities they haven&apos;t fixed either</p>
              <div className="space-y-1.5">
                {themOpps.slice(0, 3).map((o, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs">
                    <span className="text-[#484f58]">→</span>
                    <span className="flex-1 text-[#6e7681]">{o.title}</span>
                    {o.displayValue && <span className="font-mono text-[#484f58] shrink-0">{o.displayValue}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Row helpers ───────────────────────────────────────────────────────────────

function StatRow({ label, yours, theirs, compare = "more" }: {
  label: string;
  yours: string | number | null | boolean;
  theirs: string | number | null | boolean;
  compare?: "more" | "less" | "present" | "none";
}) {
  const youVal  = yours  ?? "—";
  const themVal = theirs ?? "—";
  let youWins = false, themWins = false;

  if (compare === "present") {
    youWins  = Boolean(yours)  && !Boolean(theirs);
    themWins = Boolean(theirs) && !Boolean(yours);
  } else if (compare === "more" && typeof yours === "number" && typeof theirs === "number") {
    youWins = yours > theirs; themWins = theirs > yours;
  } else if (compare === "less" && typeof yours === "number" && typeof theirs === "number") {
    youWins = yours > 0 && yours < theirs; themWins = theirs > 0 && theirs < yours;
  }

  return (
    <tr className="border-t border-[#21262d] hover:bg-[#0d1117] transition-colors">
      <td className="px-4 py-2.5 text-xs text-[#484f58] font-semibold w-40 shrink-0">{label}</td>
      <td className={`px-4 py-2.5 text-xs font-mono max-w-[230px] ${youWins ? "font-bold" : ""}`} style={{ color: youWins ? YOU_COLOR : "#8b949e" }}>
        <span className="truncate block">{String(youVal)}</span>
      </td>
      <td className={`px-4 py-2.5 text-xs font-mono max-w-[230px] ${themWins ? "font-bold" : ""}`} style={{ color: themWins ? THEM_COLOR : "#8b949e" }}>
        <span className="truncate block">{String(themVal)}</span>
      </td>
    </tr>
  );
}

function BoolRow({ label, yours, theirs }: { label: string; yours: boolean; theirs: boolean }) {
  return (
    <tr className="border-t border-[#21262d] hover:bg-[#0d1117] transition-colors">
      <td className="px-4 py-2.5 text-xs text-[#484f58] font-semibold w-40">{label}</td>
      <td className="px-4 py-2.5">
        {yours ? <CheckCircle2 className="w-4 h-4 text-[#56d364]" /> : <XCircle className="w-4 h-4 text-[#484f58]" />}
      </td>
      <td className="px-4 py-2.5">
        {theirs ? <CheckCircle2 className="w-4 h-4 text-[#56d364]" /> : <XCircle className="w-4 h-4 text-[#484f58]" />}
      </td>
    </tr>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#21262d] bg-[#0d1117]">
        <Icon className="w-4 h-4 text-[#484f58]" />
        <h3 className="text-sm font-bold text-[#c9d1d9]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#21262d]">
              <th className="px-4 py-2 text-xs text-left text-[#30363d] w-40" />
              <th className="px-4 py-2 text-xs text-left font-bold" style={{ color: YOU_COLOR }}>Your Page</th>
              <th className="px-4 py-2 text-xs text-left font-bold" style={{ color: THEM_COLOR }}>Competitor</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function ListDiff({ yours, theirs, youLabel, themLabel, limit = 15 }: { yours: string[]; theirs: string[]; youLabel: string; themLabel: string; limit?: number }) {
  const max = Math.min(Math.max(yours.length, theirs.length, 1), limit);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-[#21262d]">
            <th className="px-4 py-2 text-left font-bold" style={{ color: YOU_COLOR }}>{youLabel}</th>
            <th className="px-4 py-2 text-left font-bold" style={{ color: THEM_COLOR }}>{themLabel}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: max }).map((_, i) => (
            <tr key={i} className="border-t border-[#21262d]">
              <td className="px-4 py-2 text-[#c9d1d9]">{yours[i] ?? <span className="text-[#30363d]">—</span>}</td>
              <td className="px-4 py-2 text-[#c9d1d9]">{theirs[i] ?? <span className="text-[#30363d]">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PageAnalyserPage() {
  const searchParams = useSearchParams();
  const [yourUrl,  setYourUrl]  = useState(searchParams.get("you")  ?? "");
  const [theirUrl, setTheirUrl] = useState(searchParams.get("them") ?? "");
  const [keyword,  setKeyword]  = useState("");
  const [yourRank, setYourRank] = useState("");
  const [theirRank, setTheirRank] = useState("");
  const [status,     setStatus]     = useState<Status>("idle");
  const [result,     setResult]     = useState<{ yours: PageAnalysis; theirs: PageAnalysis } | null>(null);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [snapStatus, setSnapStatus] = useState<SnapStatus>("idle");
  const [snapYou,    setSnapYou]    = useState<SnapResult | null>(null);
  const [snapThem,   setSnapThem]   = useState<SnapResult | null>(null);
  const [perfStatus, setPerfStatus] = useState<PerfStatus>("idle");
  const [perfResult, setPerfResult] = useState<{ yours: PageSpeedResult; theirs: PageSpeedResult } | null>(null);

  const analyse = async () => {
    const yu = yourUrl.trim(), tu = theirUrl.trim();
    if (!yu || !tu) return;
    setStatus("loading"); setResult(null); setErrorMsg("");
    setSnapStatus("idle"); setSnapYou(null); setSnapThem(null);
    setPerfStatus("idle"); setPerfResult(null);

    // Kick off both requests in parallel
    const analysePromise = fetch("/api/page-analyser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yourUrl: yu, theirUrl: tu, keyword: keyword.trim() || undefined }),
    });

    const screenshotPromise = (async () => {
      setSnapStatus("loading");
      try {
        const res = await fetch("/api/page-screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yourUrl: yu, theirUrl: tu }),
        });
        const data = await res.json() as { yours: SnapResult; theirs: SnapResult };
        setSnapYou(data.yours); setSnapThem(data.theirs); setSnapStatus("done");
      } catch {
        setSnapStatus("error");
      }
    })();

    try {
      const res = await analysePromise;
      const data = await res.json() as { yours: PageAnalysis; theirs: PageAnalysis; error?: string };
      if (!res.ok || data.error) { setErrorMsg(String(data.error ?? "Unknown error")); setStatus("error"); }
      else { setResult(data); setStatus("done"); }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err)); setStatus("error");
    }

    await screenshotPromise;
  };

  const runSpeedTest = async (includeDesktop = false) => {
    const yu = yourUrl.trim(), tu = theirUrl.trim();
    if (!yu || !tu) return;
    setPerfStatus("loading");
    try {
      const res = await fetch("/api/page-speed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yourUrl: yu, theirUrl: tu, includeDesktop }),
      });
      const data = await res.json() as { yours: PageSpeedResult; theirs: PageSpeedResult };
      setPerfResult(data); setPerfStatus("done");
    } catch {
      setPerfStatus("error");
    }
  };

  const { yours, theirs } = result ?? {};
  const hasKeyword = Boolean(yours?.keywordAnalysis ?? theirs?.keywordAnalysis);
  const SCORE_CATS = getScoreCats(hasKeyword);
  const MAX_SCORE = BASE_MAX + (hasKeyword ? 20 : 0);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#e6edf3]">Page Analyser</h1>
          <p className="text-sm text-[#484f58] mt-1">Compare HTML structure, content depth, schema markup, and SEO signals side-by-side.</p>
        </div>
        <Link href="/dashboard/competitors" className="flex items-center gap-1.5 text-xs font-mono text-[#484f58] hover:text-[#00ff88] transition-colors border border-[#21262d] rounded-xl px-3 py-2 hover:border-[#00ff8840]">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
        </Link>
      </div>

      {/* URL inputs */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Your Page URL", value: yourUrl, set: setYourUrl, color: YOU_COLOR, placeholder: "https://cawardenreclaim.co.uk/services/..." },
            { label: "Competitor Page URL", value: theirUrl, set: setTheirUrl, color: THEM_COLOR, placeholder: "https://competitor.co.uk/services/..." },
          ].map(({ label, value, set, color, placeholder }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color }}>{label}</label>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5" style={{ borderColor: color + "40", background: "#0d1117" }}>
                <Globe className="w-4 h-4 shrink-0" style={{ color: color + "80" }} />
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && yourUrl && theirUrl) analyse(); }}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent text-sm text-[#c9d1d9] focus:outline-none font-mono placeholder:text-[#30363d]"
                />
              </div>
            </div>
          ))}
        </div>
        {/* Keyword input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#484f58]">Target Keyword <span className="font-normal text-[#30363d]">(optional — adds /20 keyword scoring)</span></label>
          <div className="flex items-center gap-2 border border-[#21262d] rounded-xl px-3 py-2.5" style={{ background: "#0d1117" }}>
            <Search className="w-4 h-4 shrink-0 text-[#30363d]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && yourUrl && theirUrl) analyse(); }}
              placeholder="e.g. reclamation contractors london"
              className="flex-1 bg-transparent text-sm text-[#c9d1d9] focus:outline-none font-mono placeholder:text-[#30363d]"
            />
          </div>
        </div>
        {/* Optional SERP rank inputs */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#484f58]">
            Actual Google positions <span className="font-normal normal-case text-[#30363d]">(optional — from SERP Scout)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] text-[#484f58]">Your current rank</p>
              <input
                value={yourRank}
                onChange={(e) => setYourRank(e.target.value)}
                placeholder="#?"
                type="number"
                min={1}
                className="w-full px-3 py-2 text-sm font-mono border border-[#21262d] bg-[#0d1117] text-[#00ff88] rounded-xl focus:outline-none focus:border-[#00ff8840] placeholder:text-[#30363d]"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-[#484f58]">Their current rank</p>
              <input
                value={theirRank}
                onChange={(e) => setTheirRank(e.target.value)}
                placeholder="#?"
                type="number"
                min={1}
                className="w-full px-3 py-2 text-sm font-mono border border-[#21262d] bg-[#0d1117] text-[#3b82f6] rounded-xl focus:outline-none focus:border-[#3b82f640] placeholder:text-[#30363d]"
              />
            </div>
          </div>
        </div>
        <button
          onClick={analyse}
          disabled={!yourUrl.trim() || !theirUrl.trim() || status === "loading"}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: status === "loading" ? "#00ff8830" : "#00ff88", color: "#0a0e14" }}
        >
          {status === "loading" ? (
            <><span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />Fetching &amp; Analysing both pages…</>
          ) : (
            <><Search className="w-4 h-4" />Analyse Both Pages</>
          )}
        </button>
        <p className="text-xs text-[#484f58] font-mono text-center">HTML analysis + screenshots run in parallel. Allow 15–30s for screenshots.</p>
      </div>

      {status === "error" && (
        <div className="flex items-start gap-2.5 bg-[#1e0a0a] border border-[#ff7b7240] rounded-2xl p-4">
          <AlertTriangle className="w-4 h-4 text-[#ff7b72] shrink-0 mt-0.5" />
          <p className="text-sm text-[#ff7b72]">{errorMsg}</p>
        </div>
      )}

      {yours && theirs && (
        <div className="space-y-5">

          {/* ── Visual Comparison ── */}
          <VisualComparison
            youSnap={snapYou} themSnap={snapThem} snapStatus={snapStatus}
            yourUrl={yourUrl.trim()} theirUrl={theirUrl.trim()}
          />

          {/* ── Scoreboard ── */}
          <Scoreboard
            yours={yours}
            theirs={theirs}
            scoreCats={SCORE_CATS}
            maxScore={MAX_SCORE}
            yourRank={yourRank ? parseInt(yourRank, 10) : null}
            theirRank={theirRank ? parseInt(theirRank, 10) : null}
          />

          {/* ── Quick wins ── */}
          <QuickWins yours={yours} theirs={theirs} />

          {/* ── Page Speed / CWV ── */}
          {status === "done" && perfStatus === "idle" && (
            <div className="bg-[#0d1117] border border-[#21262d] rounded-2xl p-5 flex items-center gap-4">
              <Gauge className="w-5 h-5 text-[#3b82f6] shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-[#c9d1d9]">Page Speed &amp; Core Web Vitals</p>
                <p className="text-xs text-[#484f58] mt-0.5">Mobile-only by default (2 API calls). Results cached for 1 hour.</p>
              </div>
              <button
                onClick={() => runSpeedTest(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#3b82f620] text-[#3b82f6] border border-[#3b82f640] hover:bg-[#3b82f630] transition-colors shrink-0">
                Run Speed Test
              </button>
            </div>
          )}
          <PerformanceCard
            yours={perfResult?.yours ?? null}
            theirs={perfResult?.theirs ?? null}
            status={perfStatus}
            onRun={runSpeedTest}
          />

          {/* ── Keyword Optimisation (only when keyword was supplied) ── */}
          {yours.keywordAnalysis && theirs.keywordAnalysis && (
            <KeywordOptimisation yours={yours.keywordAnalysis} theirs={theirs.keywordAnalysis} />
          )}

          {/* ── Meta ── */}
          <Section icon={FileText} title="Meta Tags">
            <StatRow label="Title"            yours={yours.title || null}            theirs={theirs.title || null}             compare="present" />
            <StatRow label="Title Length"     yours={yours.titleLength}              theirs={theirs.titleLength}               compare="none" />
            <StatRow label="Meta Description" yours={yours.metaDescription || null}  theirs={theirs.metaDescription || null}   compare="present" />
            <StatRow label="Desc. Length"     yours={yours.metaDescLength}           theirs={theirs.metaDescLength}            compare="more" />
            <BoolRow label="Canonical"        yours={!!yours.canonical}              theirs={!!theirs.canonical} />
            <StatRow label="Canonical URL"    yours={yours.canonical || null}        theirs={theirs.canonical || null}        compare="none" />
            <BoolRow label="Lang attribute"   yours={!!yours.lang}                   theirs={!!theirs.lang} />
            <StatRow label="Robots"           yours={yours.robotsMeta || "—"}        theirs={theirs.robotsMeta || "—"}        compare="none" />
          </Section>

          {/* ── Headings ── */}
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#21262d] bg-[#0d1117]">
              <Heading1 className="w-4 h-4 text-[#484f58]" />
              <h3 className="text-sm font-bold text-[#c9d1d9]">Headings</h3>
              <div className="ml-auto flex gap-4 text-xs font-mono">
                <span style={{ color: YOU_COLOR }}>H1:{yours.h1s.length} H2:{yours.h2s.length} H3:{yours.h3s.length} H4:{yours.h4s.length}</span>
                <span style={{ color: THEM_COLOR }}>H1:{theirs.h1s.length} H2:{theirs.h2s.length} H3:{theirs.h3s.length} H4:{theirs.h4s.length}</span>
              </div>
            </div>
            {yours.h1s.length > 1 && <p className="px-4 py-2 text-xs text-[#e3b341] bg-[#1a1200] border-b border-[#e3b34120] flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" />You have {yours.h1s.length} H1 tags — best practice is exactly 1</p>}
            <div className="divide-y divide-[#21262d]">
              {[{ tag: "H1", ys: yours.h1s, ts: theirs.h1s }, { tag: "H2", ys: yours.h2s, ts: theirs.h2s }, { tag: "H3", ys: yours.h3s, ts: theirs.h3s }, { tag: "H4", ys: yours.h4s, ts: theirs.h4s }].map(({ tag, ys, ts }) => (
                (ys.length > 0 || ts.length > 0) ? (
                  <div key={tag}>
                    <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#484f58] bg-[#0d1117]">{tag} tags</p>
                    <ListDiff yours={ys} theirs={ts} youLabel={`Your ${tag}s (${ys.length})`} themLabel={`Their ${tag}s (${ts.length})`} />
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {/* ── Content ── */}
          <Section icon={FileText} title="Content Depth">
            <StatRow label="Word Count"     yours={yours.wordCount}       theirs={theirs.wordCount}        compare="more" />
            <StatRow label="Paragraphs"     yours={yours.paragraphCount}  theirs={theirs.paragraphCount}   compare="more" />
            <StatRow label="Bullet Lists"   yours={yours.bulletListCount} theirs={theirs.bulletListCount}  compare="more" />
            <StatRow label="Ordered Lists"  yours={yours.orderedListCount}theirs={theirs.orderedListCount} compare="more" />
            <StatRow label="Tables"         yours={yours.tableCount}      theirs={theirs.tableCount}       compare="more" />
            <BoolRow label="Video embedded" yours={yours.hasVideo}        theirs={theirs.hasVideo} />
          </Section>

          {/* ── Images ── */}
          <Section icon={Image} title="Images">
            <StatRow label="Image Count"   yours={yours.imageCount}    theirs={theirs.imageCount}    compare="more" />
            <StatRow label="With Alt Text" yours={yours.imagesWithAlt} theirs={theirs.imagesWithAlt} compare="more" />
            <StatRow label="Alt Coverage"  yours={yours.imageCount > 0 ? `${Math.round((yours.imagesWithAlt / yours.imageCount) * 100)}%` : "—"} theirs={theirs.imageCount > 0 ? `${Math.round((theirs.imagesWithAlt / theirs.imageCount) * 100)}%` : "—"} compare="none" />
          </Section>

          {/* ── Links ── */}
          <Section icon={Link2} title="Links">
            <StatRow label="Internal Links" yours={yours.internalLinks} theirs={theirs.internalLinks} compare="more" />
            <StatRow label="External Links" yours={yours.externalLinks} theirs={theirs.externalLinks} compare="more" />
          </Section>

          {/* ── Schema ── */}
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#21262d] bg-[#0d1117]">
              <Code2 className="w-4 h-4 text-[#484f58]" />
              <h3 className="text-sm font-bold text-[#c9d1d9]">Schema Markup</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262d]">
                  <th className="px-4 py-2 text-xs text-left text-[#30363d] w-40" />
                  <th className="px-4 py-2 text-xs text-left font-bold" style={{ color: YOU_COLOR }}>Your Page</th>
                  <th className="px-4 py-2 text-xs text-left font-bold" style={{ color: THEM_COLOR }}>Competitor</th>
                </tr>
              </thead>
              <tbody>
                <BoolRow label="Has schema"       yours={yours.schemaTypes.length > 0}  theirs={theirs.schemaTypes.length > 0} />
                <BoolRow label="FAQ schema"       yours={yours.hasFaq}                  theirs={theirs.hasFaq} />
                <BoolRow label="Breadcrumb"       yours={yours.hasBreadcrumb}           theirs={theirs.hasBreadcrumb} />
                <BoolRow label="Review/Rating"    yours={yours.hasReview}               theirs={theirs.hasReview} />
              </tbody>
            </table>
            <ListDiff
              yours={yours.schemaTypes}
              theirs={theirs.schemaTypes}
              youLabel={`Your schema types (${yours.schemaTypes.length})`}
              themLabel={`Their schema types (${theirs.schemaTypes.length})`}
            />
          </div>

          {/* ── Social ── */}
          <Section icon={Share2} title="Open Graph &amp; Social Tags">
            <BoolRow label="og:title"       yours={!!yours.ogTags["title"]}       theirs={!!theirs.ogTags["title"]} />
            <BoolRow label="og:description" yours={!!yours.ogTags["description"]} theirs={!!theirs.ogTags["description"]} />
            <BoolRow label="og:image"       yours={!!yours.ogTags["image"]}       theirs={!!theirs.ogTags["image"]} />
            <StatRow label="og:type"        yours={yours.ogTags["type"] || null}  theirs={theirs.ogTags["type"] || null}  compare="none" />
            <BoolRow label="twitter:card"   yours={!!yours.twitterTags["card"]}   theirs={!!theirs.twitterTags["card"]} />
          </Section>

          {/* Error notices */}
          {(yours.error || theirs.error) && (
            <div className="space-y-2">
              {yours.error  && <div className="flex items-start gap-2 text-xs text-[#ff7b72] bg-[#1e0a0a] border border-[#ff7b7230] rounded-xl px-3 py-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />Your page: {yours.error}</div>}
              {theirs.error && <div className="flex items-start gap-2 text-xs text-[#ff7b72] bg-[#1e0a0a] border border-[#ff7b7230] rounded-xl px-3 py-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />Competitor: {theirs.error}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
