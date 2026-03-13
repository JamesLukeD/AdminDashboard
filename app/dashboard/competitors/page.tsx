"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import Papa from "papaparse";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
  PieChart, Pie, Legend, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  Upload, CheckCircle2, AlertTriangle, Globe, ExternalLink,
  Target, Zap, Save, RotateCcw, Clock, GitCompareArrows, ScanEye, ArrowRight,
} from "lucide-react";
import { detectExportType, buildDomainProfile, buildKeywordGap, getBacklinkStats } from "@/lib/semrush";
import {
  STORAGE_KEY_YOU, STORAGE_KEY_THEM,
  loadSaved, persistProfile, clearSavedProfile, formatSavedAt,
} from "@/lib/competitor-storage";
import { TRACKED_COMPETITORS } from "@/lib/tracked-competitors";
import type { DomainProfile, SemrushExportType } from "@/types/competitor";

const YOU_COLOR  = "#00ff88";
const THEM_COLOR = "#3b82f6";
const YOU_LIGHT  = "#0a1a12";
const THEM_LIGHT = "#0a1420";

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function VisualKpi({ label, yours, theirs, youLabel, themLabel, higherIsBetter = true, format = fmtNum }: {
  label: string; yours: number; theirs: number; youLabel: string; themLabel: string; higherIsBetter?: boolean; format?: (n: number) => string;
}) {
  const total = yours + theirs || 1;
  const youPct = Math.round((yours / total) * 100);
  const youWin = higherIsBetter ? yours >= theirs : yours <= theirs;
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-4 space-y-3">
      <p className="text-xs font-semibold text-[#484f58] uppercase tracking-wide">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <div><p className="text-xl font-bold" style={{ color: youWin ? YOU_COLOR : "#374151" }}>{format(yours)}</p><p className="text-xs text-[#6e7681] mt-0.5 truncate max-w-[90px]">{youLabel}</p></div>
        <div className="text-right"><p className="text-xl font-bold" style={{ color: !youWin ? THEM_COLOR : "#9ca3af" }}>{format(theirs)}</p><p className="text-xs text-[#6e7681] mt-0.5 truncate max-w-[90px]">{themLabel}</p></div>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-[#0a0e14] flex">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${youPct}%`, background: YOU_COLOR }} />
      </div>
      <div className="flex justify-between text-xs">
        <span style={{ color: YOU_COLOR }} className="font-semibold">{youPct}%</span>
        <span style={{ color: THEM_COLOR }} className="font-semibold">{100 - youPct}%</span>
      </div>
    </div>
  );
}

function DomainHero({ profile, domain, color, light, label }: { profile: DomainProfile | null; domain: string; color: string; light: string; label: string }) {
  if (!profile) return (
    <div className="flex-1 rounded-2xl border-2 border-dashed border-[#30363d] bg-[#0d1117] p-6 flex flex-col items-center justify-center text-center gap-2">
      <Globe className="w-8 h-8 text-[#30363d]" />
      <p className="text-sm text-[#6e7681] font-medium">{label} — not uploaded yet</p>
    </div>
  );
  return (
    <div className="flex-1 rounded-2xl border p-5 space-y-4" style={{ background: light, borderColor: color + "40" }}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
        <p className="font-bold text-[#c9d1d9] text-sm truncate">{domain || label}</p>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: color }}>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[{ label: "Keywords", value: fmtNum(profile.totalKeywords) }, { label: "Est. Traffic", value: fmtNum(profile.totalTraffic) }, { label: "Top 3", value: fmtNum(profile.top3Count) }, { label: "Top 10", value: fmtNum(profile.top10Count) }, { label: "Avg. Pos.", value: profile.avgPosition > 0 ? profile.avgPosition.toFixed(1) : "—" }, { label: "Backlinks", value: fmtNum(profile.backlinks.length) }].map((s) => (
          <div key={s.label}><p className="text-xs text-[#484f58]">{s.label}</p><p className="text-lg font-bold text-[#c9d1d9]">{s.value}</p></div>
        ))}
      </div>
    </div>
  );
}

function UploadPanel({ label, profile, onFile, color }: { label: string; profile: DomainProfile | null; onFile: (f: File) => void; color: string }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFiles = useCallback((files: FileList | null) => { if (!files || files.length === 0) return; Array.from(files).forEach((f) => onFile(f)); }, [onFile]);
  const kws = profile?.keywords.length ?? 0, bls = profile?.backlinks.length ?? 0, pgs = profile?.topPages.length ?? 0;
  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="relative border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-all text-center select-none"
        style={isDragOver ? { borderColor: color, background: color + "10", transform: "scale(1.01)" } : { borderColor: "#30363d", background: "#0d1117" }}
      >
        <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Upload className="w-5 h-5 mx-auto mb-1.5" style={{ color: isDragOver ? color : "#484f58" }} />
        <p className="text-xs text-[#484f58] font-medium">Drop CSV files or click to browse</p>
        <p className="text-xs text-[#30363d]">Keywords · Pages · Backlinks</p>
      </div>
      {profile && (
        <div className="flex gap-2 flex-wrap">
          {[{ label: "Keywords", count: kws }, { label: "Pages", count: pgs }, { label: "Backlinks", count: bls }].map(({ label: l, count }) => (
            <div key={l} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border flex-1 ${count > 0 ? "border-[#1a4a2a] bg-[#0a1a12] text-[#56d364]" : "border-[#21262d] bg-[#0d1117] text-[#6e7681]"}`}>
              {count > 0 ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : null}
              <span className="font-medium">{l}</span>
              {count > 0 && <span className="ml-auto font-bold">{fmtNum(count)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RadarComp({ you, them, youLabel, themLabel }: { you: DomainProfile; them: DomainProfile; youLabel: string; themLabel: string }) {
  const norm = (v: number, max: number) => max > 0 ? Math.round((v / max) * 100) : 0;
  const mK = Math.max(you.totalKeywords, them.totalKeywords, 1), mT = Math.max(you.totalTraffic, them.totalTraffic, 1), m3 = Math.max(you.top3Count, them.top3Count, 1), m10 = Math.max(you.top10Count, them.top10Count, 1), mB = Math.max(you.backlinks.length, them.backlinks.length, 1);
  const data = [{ metric: "Keywords", you: norm(you.totalKeywords, mK), them: norm(them.totalKeywords, mK) }, { metric: "Traffic", you: norm(you.totalTraffic, mT), them: norm(them.totalTraffic, mT) }, { metric: "Top 3", you: norm(you.top3Count, m3), them: norm(them.top3Count, m3) }, { metric: "Top 10", you: norm(you.top10Count, m10), them: norm(them.top10Count, m10) }, { metric: "Backlinks", you: norm(you.backlinks.length, mB), them: norm(them.backlinks.length, mB) }];
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-5">
      <h3 className="font-semibold text-[#c9d1d9] text-sm mb-1">Competitive Radar</h3>
      <p className="text-xs text-[#6e7681] mb-3">Normalised scores — 100 = leader in each category</p>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data}>
          <PolarGrid stroke="#21262d" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
          <Radar name="you" dataKey="you" stroke={YOU_COLOR} fill={YOU_COLOR} fillOpacity={0.2} strokeWidth={2} />
          <Radar name="them" dataKey="them" stroke={THEM_COLOR} fill={THEM_COLOR} fillOpacity={0.15} strokeWidth={2} />
          <Legend formatter={(v) => v === "you" ? youLabel : themLabel} wrapperStyle={{ fontSize: 11 }} />
          <Tooltip formatter={(v: unknown, n: string | undefined) => [`${v}`, n === "you" ? youLabel : (n === "them" ? themLabel : String(n))]} contentStyle={{ fontSize: 12, borderRadius: 12, background: "#161b22", border: "1px solid #30363d" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GapDonut({ gap }: { gap: ReturnType<typeof buildKeywordGap> }) {
  const data = [
    { name: "Gaps (they rank, you don't)", value: gap.filter((g) => g.opportunity === "gap").length, color: "#ff7b72" },
    { name: "Losing (you rank lower)", value: gap.filter((g) => g.opportunity === "behind").length, color: "#e3b341" },
    { name: "Winning (you rank higher)", value: gap.filter((g) => g.opportunity === "ahead").length, color: "#56d364" },
    { name: "Tied", value: gap.filter((g) => g.opportunity === "tied").length, color: "#30363d" },
  ].filter((d) => d.value > 0);
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-5">
      <h3 className="font-semibold text-[#c9d1d9] text-sm mb-1">Keyword Opportunity Map</h3>
      <p className="text-xs text-[#6e7681] mb-4">{gap.length.toLocaleString()} total shared keywords</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
            {data.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Pie>
          <Tooltip formatter={(v: unknown) => [fmtNum(v as number), ""]} contentStyle={{ fontSize: 12, borderRadius: 12, background: "#161b22", border: "1px solid #30363d" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function PositionDistChart({ you, them, youLabel, themLabel }: { you: DomainProfile; them: DomainProfile; youLabel: string; themLabel: string }) {
  const buckets = [{ name: "#1–3", min: 1, max: 3 }, { name: "#4–10", min: 4, max: 10 }, { name: "#11–20", min: 11, max: 20 }, { name: "#21–50", min: 21, max: 50 }, { name: "#51+", min: 51, max: Infinity }];
  const data = buckets.map(({ name, min, max }) => ({ name, you: you.keywords.filter((k) => k.position >= min && k.position <= max).length, them: them.keywords.filter((k) => k.position >= min && k.position <= max).length }));
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-5">
      <h3 className="font-semibold text-[#c9d1d9] text-sm mb-4">Ranking Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={35} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, background: "#161b22", border: "1px solid #30363d" }} />
          <Legend formatter={(v) => v === "you" ? youLabel : themLabel} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="you" name="you" fill={YOU_COLOR} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="you" position="top" style={{ fontSize: 10, fill: "#6b7280" }} formatter={(v: unknown) => (v as number) > 0 ? String(v) : ""} />
          </Bar>
          <Bar dataKey="them" name="them" fill={THEM_COLOR} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="them" position="top" style={{ fontSize: 10, fill: "#6b7280" }} formatter={(v: unknown) => (v as number) > 0 ? String(v) : ""} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── SEMrush export links ───────────────────────────────────────────────────────

const SEMRUSH_EXPORTS = [
  { id: "positions", label: "Organic Positions", note: "all keywords & rankings",   path: "analytics/organic/positions" },
  { id: "pages",     label: "Top Pages",         note: "best performing pages",      path: "analytics/organic/pages"      },
  { id: "backlinks", label: "Backlinks",          note: "full link profile",          path: "analytics/backlinks"          },
] as const;

function semrushDomain(input: string) {
  return input.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
}

function SemrushLinks({ domain, color }: { domain: string; color: string }) {
  const clean = semrushDomain(domain);
  const valid = clean.includes(".");
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#484f58]">
        {valid ? `Get exports from SEMrush for ${clean}` : "Enter a domain above to get export links"}
      </p>
      {SEMRUSH_EXPORTS.map(({ id, label, note, path }, i) => {
        const href = valid
          ? `https://www.semrush.com/${path}/?q=${encodeURIComponent(clean)}&db=uk`
          : null;
        return href ? (
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#21262d] bg-[#0d1117] hover:border-[#30363d] hover:bg-[#161b22] transition-all group"
          >
            <span className="text-xs font-black text-[#484f58] w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#c9d1d9] group-hover:text-white transition-colors">{label}</p>
              <p className="text-[10px] text-[#484f58]">{note} · then Export → CSV</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color }} />
          </a>
        ) : (
          <div
            key={id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#1a1f27] bg-[#0a0d12] opacity-40 select-none"
          >
            <span className="text-xs font-black text-[#30363d] w-4 shrink-0">{i + 1}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#484f58]">{label}</p>
              <p className="text-[10px] text-[#30363d]">{note}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#21262d] shrink-0" />
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CompetitorsPage() {
  const [youProfile, setYouProfile] = useState<DomainProfile | null>(null);
  const [themProfile, setThemProfile] = useState<DomainProfile | null>(null);
  const [youDomain, setYouDomain]     = useState("cawardenreclaim.co.uk");
  const [themDomain, setThemDomain]   = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [youSavedAt, setYouSavedAt]   = useState<string | null>(null);
  const [themSavedAt, setThemSavedAt] = useState<string | null>(null);
  const [restored, setRestored]       = useState(false);

  useEffect(() => {
    const sy = loadSaved(STORAGE_KEY_YOU);
    const st = loadSaved(STORAGE_KEY_THEM);
    if (sy) { setYouProfile(sy.profile); setYouDomain(sy.domain); setYouSavedAt(sy.savedAt); setRestored(true); }
    if (st) { setThemProfile(st.profile); setThemDomain(st.domain); setThemSavedAt(st.savedAt); setRestored(true); }
  }, []);

  useEffect(() => {
    if (youProfile) { persistProfile(STORAGE_KEY_YOU, youProfile, youDomain); setYouSavedAt(new Date().toISOString()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youProfile]);

  useEffect(() => {
    if (themProfile) { persistProfile(STORAGE_KEY_THEM, themProfile, themDomain); setThemSavedAt(new Date().toISOString()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themProfile]);

  const parseAndMerge = useCallback((file: File, isYours: boolean) => {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const type: SemrushExportType = detectExportType(result.meta.fields ?? []);
        if (type === "unknown") { setParseErrors((e) => [...e, `"${file.name}" — unrecognised export.`]); return; }
        const domain = isYours ? youDomain : themDomain;
        if (isYours) setYouProfile((p) => buildDomainProfile(domain, p, type, result.data));
        else         setThemProfile((p) => buildDomainProfile(domain, p, type, result.data));
        setRestored(false);
      },
      error: (err) => setParseErrors((e) => [...e, `"${file.name}" — ${err.message}`]),
    });
  }, [youDomain, themDomain]);

  const clearSide = (isYours: boolean) => {
    if (isYours) { clearSavedProfile(STORAGE_KEY_YOU); setYouProfile(null); setYouDomain("Your site"); setYouSavedAt(null); }
    else         { clearSavedProfile(STORAGE_KEY_THEM); setThemProfile(null); setThemDomain("Competitor"); setThemSavedAt(null); }
  };

  const gap       = youProfile && themProfile ? buildKeywordGap(youProfile, themProfile) : [];
  const hasBoth   = !!(youProfile && themProfile);
  const hasAny    = !!(youProfile || themProfile);
  const hasKw     = (youProfile?.keywords.length ?? 0) > 0 && (themProfile?.keywords.length ?? 0) > 0;
  const backlinkStats = hasBoth ? { you: getBacklinkStats(youProfile!), them: getBacklinkStats(themProfile!) } : null;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e6edf3]">Competitor Analysis</h1>
        <p className="text-sm text-[#484f58] mt-1">Upload SEMrush exports to compare keywords, traffic, content gaps, and link profiles.</p>
      </div>

      {parseErrors.length > 0 && (
        <div className="bg-[#1e0a0a] border border-[#ff7b7240] rounded-2xl p-4 space-y-1">
          {parseErrors.map((e, i) => <div key={i} className="flex items-start gap-2 text-sm text-[#ff7b72]"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{e}</span></div>)}
          <button onClick={() => setParseErrors([])} className="text-xs text-[#ff7b72] underline mt-1">Dismiss</button>
        </div>
      )}

      {restored && hasAny && (
        <div className="flex items-center gap-2.5 bg-[#0a1a12] border border-[#00ff8830] rounded-2xl px-4 py-3">
          <Save className="w-4 h-4 text-[#00ff88] shrink-0" />
          <p className="text-xs font-mono text-[#00ff88] flex-1">
            Loaded saved report —
            {youProfile && youSavedAt && <span className="text-[#56d364]"> {youDomain} ({formatSavedAt(youSavedAt)})</span>}
            {youProfile && themProfile && <span className="text-[#484f58]"> · </span>}
            {themProfile && themSavedAt && <span className="text-[#56d364]"> {themDomain} ({formatSavedAt(themSavedAt)})</span>}
          </p>
          <button onClick={() => setRestored(false)} className="text-[10px] font-mono text-[#484f58] hover:text-[#8b949e] transition-colors">dismiss</button>
        </div>
      )}

      {/* Setup section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ── Your Site ── */}
        <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: YOU_COLOR }} />
            <span className="text-sm font-bold text-[#e6edf3]">Your Site</span>
            {youSavedAt && <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-[#484f58]"><Clock className="w-3 h-3" />{formatSavedAt(youSavedAt)}</span>}
            {youProfile && <button onClick={() => clearSide(true)} className="flex items-center gap-1 text-[10px] font-mono text-[#484f58] hover:text-[#ff7b72] transition-colors"><RotateCcw className="w-3 h-3" />clear</button>}
          </div>

          {/* Domain */}
          <div className="space-y-1.5">
            <button
              onClick={() => setYouDomain("cawardenreclaim.co.uk")}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left"
              style={youDomain === "cawardenreclaim.co.uk"
                ? { background: "#00ff8815", borderColor: "#00ff8840", color: YOU_COLOR }
                : { background: "#0d1117",    borderColor: "#21262d",    color: "#6e7681" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ opacity: youDomain === "cawardenreclaim.co.uk" ? 1 : 0.3 }} />
              <span className="text-xs font-mono font-semibold">cawardenreclaim.co.uk</span>
            </button>
            <input
              value={youDomain}
              onChange={(e) => setYouDomain(e.target.value)}
              placeholder="or type a different domain"
              className="w-full px-3 py-2 text-xs font-mono border border-[#21262d] bg-[#0d1117] text-[#c9d1d9] rounded-xl focus:outline-none focus:border-[#00ff8840] placeholder:text-[#30363d]"
            />
          </div>

          {/* SEMrush export links */}
          <SemrushLinks domain={youDomain} color={YOU_COLOR} />

          {/* Upload */}
          <UploadPanel label="Your Site" profile={youProfile} onFile={(f) => parseAndMerge(f, true)} color={YOU_COLOR} />
        </div>

        {/* ── Competitor ── */}
        <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: THEM_COLOR }} />
            <span className="text-sm font-bold text-[#e6edf3]">Competitor</span>
            {themSavedAt && <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-[#484f58]"><Clock className="w-3 h-3" />{formatSavedAt(themSavedAt)}</span>}
            {themProfile && <button onClick={() => clearSide(false)} className="flex items-center gap-1 text-[10px] font-mono text-[#484f58] hover:text-[#ff7b72] transition-colors"><RotateCcw className="w-3 h-3" />clear</button>}
          </div>

          {/* Pick + domain */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#484f58]">Quick select</p>
            <div className="flex flex-wrap gap-1.5">
              {TRACKED_COMPETITORS.map((tc) => (
                <button
                  key={tc.name}
                  onClick={() => setThemDomain(tc.url || "")}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all"
                  style={themDomain === (tc.url || "") && tc.url
                    ? { background: "#3b82f620", borderColor: "#3b82f640", color: THEM_COLOR }
                    : { background: "#0d1117",    borderColor: "#21262d",    color: "#6e7681" }}
                >
                  {tc.name}
                </button>
              ))}
            </div>
            <input
              value={themDomain}
              onChange={(e) => setThemDomain(e.target.value)}
              placeholder="type their domain, e.g. competitor.co.uk"
              className="w-full px-3 py-2 text-xs font-mono border border-[#21262d] bg-[#0d1117] text-[#c9d1d9] rounded-xl focus:outline-none focus:border-[#3b82f640] placeholder:text-[#30363d]"
            />
          </div>

          {/* SEMrush export links */}
          <SemrushLinks domain={themDomain} color={THEM_COLOR} />

          {/* Upload */}
          <UploadPanel label="Competitor" profile={themProfile} onFile={(f) => parseAndMerge(f, false)} color={THEM_COLOR} />
        </div>

      </div>

      {/* Hero cards */}
      {hasAny && (
        <div className="flex gap-4 items-stretch">
          <DomainHero profile={youProfile} domain={youDomain} color={YOU_COLOR} light={YOU_LIGHT} label="Your Site" />
          <div className="flex flex-col items-center justify-center px-1">
            <div className="w-8 h-8 rounded-full bg-[#161b22] flex items-center justify-center border border-[#21262d]">
              <span className="text-xs font-black text-[#6e7681]">VS</span>
            </div>
          </div>
          <DomainHero profile={themProfile} domain={themDomain} color={THEM_COLOR} light={THEM_LIGHT} label="Competitor" />
        </div>
      )}

      {/* Overview charts */}
      {hasBoth && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <VisualKpi label="Total Keywords" yours={youProfile!.totalKeywords} theirs={themProfile!.totalKeywords} youLabel={youDomain} themLabel={themDomain} />
            <VisualKpi label="Est. Monthly Traffic" yours={youProfile!.totalTraffic} theirs={themProfile!.totalTraffic} youLabel={youDomain} themLabel={themDomain} />
            <VisualKpi label="Top 3 Rankings" yours={youProfile!.top3Count} theirs={themProfile!.top3Count} youLabel={youDomain} themLabel={themDomain} />
            <VisualKpi label="Top 10 Rankings" yours={youProfile!.top10Count} theirs={themProfile!.top10Count} youLabel={youDomain} themLabel={themDomain} />
            <VisualKpi label="Avg. Position" yours={youProfile!.avgPosition} theirs={themProfile!.avgPosition} youLabel={youDomain} themLabel={themDomain} higherIsBetter={false} format={(n) => n > 0 ? n.toFixed(1) : "—"} />
          </div>

          {backlinkStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <VisualKpi label="Total Backlinks" yours={backlinkStats.you.total} theirs={backlinkStats.them.total} youLabel={youDomain} themLabel={themDomain} />
              <VisualKpi label="Unique Domains" yours={backlinkStats.you.uniqueDomains} theirs={backlinkStats.them.uniqueDomains} youLabel={youDomain} themLabel={themDomain} />
              <VisualKpi label="Dofollow" yours={backlinkStats.you.dofollow} theirs={backlinkStats.them.dofollow} youLabel={youDomain} themLabel={themDomain} />
              <VisualKpi label="Nofollow" yours={backlinkStats.you.nofollow} theirs={backlinkStats.them.nofollow} youLabel={youDomain} themLabel={themDomain} higherIsBetter={false} />
            </div>
          )}

          {hasKw && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RadarComp you={youProfile!} them={themProfile!} youLabel={youDomain} themLabel={themDomain} />
              <GapDonut gap={gap} />
            </div>
          )}
          {hasKw && <PositionDistChart you={youProfile!} them={themProfile!} youLabel={youDomain} themLabel={themDomain} />}
        </div>
      )}

      {/* Navigation cards to sub-tools */}
      {hasAny && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/competitors/keyword-gap" className="group block bg-[#161b22] border border-[#21262d] hover:border-[#00ff8840] rounded-2xl p-5 transition-all hover:shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#00ff8815" }}>
                <GitCompareArrows className="w-5 h-5" style={{ color: "#00ff88" }} />
              </div>
              <div>
                <p className="font-semibold text-[#e6edf3] text-sm">Keyword Gap</p>
                {hasKw && <p className="text-xs text-[#484f58]">{gap.filter(g => g.opportunity === "gap").length} gaps · {gap.filter(g => g.opportunity === "ahead").length} wins</p>}
              </div>
              <ArrowRight className="w-4 h-4 text-[#30363d] group-hover:text-[#00ff88] ml-auto transition-colors" />
            </div>
            <p className="text-xs text-[#6e7681]">Compare keyword rankings, find gaps, top pages and backlink profiles side-by-side.</p>
            {!hasKw && <p className="text-xs text-[#e3b341] mt-2">↑ Upload keyword CSV exports above first</p>}
          </Link>
          <Link href="/dashboard/competitors/page-analyser" className="group block bg-[#161b22] border border-[#21262d] hover:border-[#79c0ff40] rounded-2xl p-5 transition-all hover:shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#79c0ff15" }}>
                <ScanEye className="w-5 h-5" style={{ color: "#79c0ff" }} />
              </div>
              <div>
                <p className="font-semibold text-[#e6edf3] text-sm">Page Analyser</p>
                <p className="text-xs text-[#484f58]">HTML structure diff tool</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#30363d] group-hover:text-[#79c0ff] ml-auto transition-colors" />
            </div>
            <p className="text-xs text-[#6e7681]">Fetch any two URLs and compare headings, schema, word count, meta tags, and content structure.</p>
          </Link>
        </div>
      )}

      {!hasAny && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5" style={{ background: YOU_LIGHT }}>
            <Target className="w-10 h-10" style={{ color: YOU_COLOR }} />
          </div>
          <p className="font-bold text-[#8b949e] text-xl">Ready to analyse competitors</p>
          <p className="text-sm text-[#6e7681] mt-2 max-w-sm mx-auto">Upload SEMrush CSV exports above to start comparing keyword visibility, traffic, backlinks, and content gaps.</p>
        </div>
      )}
    </div>
  );
}
