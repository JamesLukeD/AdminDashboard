"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { ArrowUp, ArrowDown, Minus, Database, ExternalLink, ArrowLeft } from "lucide-react";
import { buildKeywordGap, getBacklinkStats } from "@/lib/semrush";
import {
  STORAGE_KEY_YOU, STORAGE_KEY_THEM,
  loadSaved, formatSavedAt,
} from "@/lib/competitor-storage";
import type { DomainProfile, CompetitorGap } from "@/types/competitor";

const YOU_COLOR  = "#00ff88";
const THEM_COLOR = "#3b82f6";

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function Th({ children, onClick, sorted }: { children: React.ReactNode; onClick?: () => void; sorted?: "asc" | "desc" | null }) {
  return (
    <th
      className={`text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide border-b border-[#21262d] select-none ${onClick ? "cursor-pointer hover:text-[#00ff88]" : ""} text-[#484f58]`}
      onClick={onClick}
    >
      <span className="flex items-center gap-1">
        {children}
        {sorted === "asc"  && <ArrowUp className="w-3 h-3" />}
        {sorted === "desc" && <ArrowDown className="w-3 h-3" />}
      </span>
    </th>
  );
}

type SortKey = "keyword" | "searchVolume" | "kd" | "yourPosition" | "theirPosition";
type GapFilter = "all" | "gap" | "behind" | "ahead";

function useSortedFiltered(items: CompetitorGap[], filter: GapFilter, search: string) {
  const [sortKey, setSortKey] = useState<SortKey>("searchVolume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggle = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };
  const sorted = useMemo(() => {
    const filtered = items.filter((g) => (filter === "all" || g.opportunity === filter) && (search === "" || g.keyword.toLowerCase().includes(search.toLowerCase())));
    return [...filtered].sort((a, b) => {
      let av: number | string = (a[sortKey] ?? 999) as number | string;
      let bv: number | string = (b[sortKey] ?? 999) as number | string;
      if (typeof av === "string") { av = av.toLowerCase(); bv = (bv as string).toLowerCase(); }
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [items, filter, search, sortKey, sortDir]);
  return { sorted, sortKey, sortDir, toggle };
}

function KeywordGapSection({ gap, youLabel, themLabel }: { gap: CompetitorGap[]; youLabel: string; themLabel: string }) {
  const [filter, setFilter] = useState<GapFilter>("all");
  const [search, setSearch]   = useState("");
  const { sorted, sortKey, sortDir, toggle } = useSortedFiltered(gap, filter, search);
  const counts = { all: gap.length, gap: gap.filter((g) => g.opportunity === "gap").length, behind: gap.filter((g) => g.opportunity === "behind").length, ahead: gap.filter((g) => g.opportunity === "ahead").length };
  const oppColors: Record<string, string> = { gap: "#ff7b72", behind: "#e3b341", ahead: "#56d364", tied: "#6e7681" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "gap", "behind", "ahead"] as GapFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter === f ? "border-[#00ff88] text-[#00ff88] bg-[#00ff8815]" : "border-[#30363d] text-[#6e7681] hover:border-[#484f58]"}`}>
            {f === "all" ? "All" : f === "gap" ? "Gaps" : f === "behind" ? "Losing" : "Winning"}
            <span className="ml-1.5 opacity-70">{counts[f]}</span>
          </button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter keyword…" className="ml-auto px-3 py-1.5 text-xs rounded-xl border border-[#30363d] bg-[#0d1117] text-[#c9d1d9] focus:outline-none focus:border-[#00ff88] w-40" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#21262d]">
        <table className="w-full text-sm font-mono">
          <thead className="bg-[#161b22]">
            <tr>
              <Th onClick={() => toggle("keyword")} sorted={sortKey === "keyword" ? sortDir : null}>Keyword</Th>
              <Th onClick={() => toggle("searchVolume")} sorted={sortKey === "searchVolume" ? sortDir : null}>Volume</Th>
              <Th onClick={() => toggle("kd")} sorted={sortKey === "kd" ? sortDir : null}>KD</Th>
              <Th onClick={() => toggle("yourPosition")} sorted={sortKey === "yourPosition" ? sortDir : null}>{youLabel}</Th>
              <Th onClick={() => toggle("theirPosition")} sorted={sortKey === "theirPosition" ? sortDir : null}>{themLabel}</Th>
              <Th>Opportunity</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 200).map((g, i) => (
              <tr key={i} className="border-t border-[#21262d] hover:bg-[#161b22] transition-colors">
                <td className="px-3 py-2 font-semibold text-[#c9d1d9] max-w-[200px]">
                  <span className="truncate block max-w-full">{g.keyword}</span>
                  {g.yourUrl && <a href={g.yourUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#484f58] hover:text-[#00ff88] flex items-center gap-0.5 mt-0.5 truncate max-w-full"><ExternalLink className="w-2.5 h-2.5 shrink-0" />{g.yourUrl.replace(/^https?:\/\//, "")}</a>}
                </td>
                <td className="px-3 py-2 text-[#8b949e]">{fmtNum(g.searchVolume)}</td>
                <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${g.kd >= 80 ? "bg-[#ff7b7220] text-[#ff7b72]" : g.kd >= 50 ? "bg-[#e3b34120] text-[#e3b341]" : "bg-[#56d36420] text-[#56d364]"}`}>{g.kd}</span></td>
                <td className="px-3 py-2">{g.yourPosition != null && g.yourPosition > 0 ? <span className="font-bold text-[#00ff88]">#{g.yourPosition}</span> : <span className="text-[#30363d]">—</span>}</td>
                <td className="px-3 py-2">{g.theirPosition != null && g.theirPosition > 0 ? <span className="font-bold text-[#79c0ff]">#{g.theirPosition}</span> : <span className="text-[#30363d]">—</span>}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-lg text-xs font-semibold capitalize" style={{ background: oppColors[g.opportunity] + "20", color: oppColors[g.opportunity] }}>{g.opportunity}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length > 200 && <p className="text-xs text-center text-[#484f58] py-3">Showing 200 of {sorted.length.toLocaleString()} rows</p>}
        {sorted.length === 0 && <p className="text-xs text-center text-[#484f58] py-8">No results matching current filter</p>}
      </div>
    </div>
  );
}

function RankingBattleSection({ you, them, youLabel, themLabel }: { you: DomainProfile; them: DomainProfile; youLabel: string; themLabel: string }) {
  const shared = useMemo(() => {
    const tm = new Map(them.keywords.map((k) => [k.keyword.toLowerCase(), k]));
    return you.keywords.filter((k) => tm.has(k.keyword.toLowerCase())).slice(0, 500).map((k) => ({
      keyword: k.keyword, you: k.position, them: tm.get(k.keyword.toLowerCase())!.position,
      volume: k.searchVolume,
    }));
  }, [you, them]);
  return (
    <div className="space-y-4">
      <p className="text-xs text-[#6e7681]">{shared.length.toLocaleString()} shared keywords — each dot is one keyword. Above the diagonal = you rank higher.</p>
      <div className="bg-[#0d1117] rounded-2xl border border-[#21262d] overflow-x-auto">
        <div className="min-w-[400px]">
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis type="number" dataKey="you" name={youLabel} domain={[1, 100]} label={{ value: youLabel, position: "insideBottom", offset: -5, style: { fill: "#6b7280", fontSize: 11 } }} tick={{ fontSize: 10, fill: "#6b7280" }} />
              <YAxis type="number" dataKey="them" name={themLabel} domain={[1, 100]} label={{ value: themLabel, angle: -90, position: "insideLeft", offset: 10, style: { fill: "#6b7280", fontSize: 11 } }} tick={{ fontSize: 10, fill: "#6b7280" }} />
              <ZAxis dataKey="volume" range={[20, 200]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-xs space-y-1">
                    <p className="font-bold text-[#c9d1d9]">{d.keyword}</p>
                    <p className="text-[#00ff88]">{youLabel}: #{d.you}</p>
                    <p className="text-[#79c0ff]">{themLabel}: #{d.them}</p>
                    <p className="text-[#6e7681]">Volume: {fmtNum(d.volume)}</p>
                  </div>
                );
              }} />
              <Scatter data={shared} fill={YOU_COLOR} fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TopPagesChart({ pages, color }: { pages: DomainProfile["topPages"]; color: string }) {
  const data = pages.slice(0, 10).map((p) => ({
    url: p.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 30) || "/",
    traffic: p.traffic, keywords: p.keywords,
  }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} />
        <YAxis type="category" dataKey="url" width={130} tick={{ fontSize: 10, fill: "#6b7280" }} />
        <Tooltip contentStyle={{ fontSize: 12, background: "#161b22", border: "1px solid #30363d", borderRadius: 12 }} />
        <Bar dataKey="traffic" fill={color} radius={[0, 4, 4, 0]} name="Traffic">
          <LabelList dataKey="traffic" position="right" style={{ fontSize: 10, fill: "#6b7280" }} formatter={(v: unknown) => fmtNum(v as number)} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopPagesSection({ you, them, youLabel, themLabel }: { you: DomainProfile; them: DomainProfile; youLabel: string; themLabel: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[{ profile: you, label: youLabel, color: YOU_COLOR }, { profile: them, label: themLabel, color: THEM_COLOR }].map(({ profile, label, color }) => (
        <div key={label} className="space-y-3">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /><p className="font-semibold text-sm text-[#8b949e]">{label} — Top Pages by Traffic</p></div>
          {profile.topPages.length > 0 ? (
            <>
              <div className="bg-[#0d1117] rounded-2xl border border-[#21262d] px-2 pt-2">
                <TopPagesChart pages={profile.topPages} color={color} />
              </div>
              <div className="overflow-x-auto rounded-2xl border border-[#21262d]">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-[#161b22]"><tr><Th>Page</Th><Th>Traffic</Th><Th>Keywords</Th></tr></thead>
                  <tbody>
                    {profile.topPages.slice(0, 20).map((p, i) => (
                      <tr key={i} className="border-t border-[#21262d] hover:bg-[#161b22]">
                        <td className="px-3 py-2 max-w-[200px]"><a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[#79c0ff] hover:underline truncate block">{p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}</a></td>
                        <td className="px-3 py-2 text-[#00ff88] font-bold">{fmtNum(p.traffic)}</td>
                        <td className="px-3 py-2 text-[#8b949e]">{p.keywords}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="rounded-2xl border-2 border-dashed border-[#21262d] p-8 text-center text-xs text-[#484f58]"><Database className="w-6 h-6 mx-auto mb-2 opacity-30" />No pages data — upload a Pages CSV on the Competitors page</div>}
        </div>
      ))}
    </div>
  );
}

function BacklinkDonut({ stats, label, color }: { stats: ReturnType<typeof getBacklinkStats>; label: string; color: string }) {
  const data = [{ name: "Dofollow", value: stats.dofollow }, { name: "Nofollow", value: stats.nofollow }].filter((d) => d.value > 0);
  if (data.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#6e7681]">{label}</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3}>
            {data.map((_, i) => <Cell key={i} fill={i === 0 ? color : "#374151"} />)}
          </Pie>
          <Tooltip formatter={(v: unknown) => [fmtNum(v as number), ""]} contentStyle={{ fontSize: 11, background: "#161b22", border: "1px solid #30363d", borderRadius: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center space-y-0.5">
        <p className="text-xs font-mono text-[#c9d1d9]">{fmtNum(stats.total)} total</p>
        <p className="text-xs text-[#6e7681]">{stats.uniqueDomains} ref. domains</p>
      </div>
    </div>
  );
}

function BacklinksSection({ you, them, youLabel, themLabel }: { you: DomainProfile; them: DomainProfile; youLabel: string; themLabel: string }) {
  const youStats  = getBacklinkStats(you);
  const themStats = getBacklinkStats(them);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-8">
        <BacklinkDonut stats={youStats} label={youLabel} color={YOU_COLOR} />
        <BacklinkDonut stats={themStats} label={themLabel} color={THEM_COLOR} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[{ profile: you, label: youLabel, color: YOU_COLOR }, { profile: them, label: themLabel, color: THEM_COLOR }].map(({ profile, label, color }) => (
          <div key={label} className="space-y-2">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /><p className="text-xs font-semibold text-[#6e7681]">{label} — Sample Backlinks</p></div>
            {profile.backlinks.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-[#21262d]">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-[#161b22]"><tr><Th>Source</Th><Th>Type</Th><Th>Target</Th></tr></thead>
                  <tbody>
                    {profile.backlinks.slice(0, 20).map((b, i) => (
                      <tr key={i} className="border-t border-[#21262d] hover:bg-[#161b22]">
                        <td className="px-3 py-2 max-w-[160px]"><a href={b.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#79c0ff] hover:underline truncate block">{b.sourceTitle || new URL(b.sourceUrl).hostname}</a></td>
                        <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${b.type === "dofollow" ? "bg-[#56d36420] text-[#56d364]" : "bg-[#30363d] text-[#6e7681]"}`}>{b.type}</span></td>
                        <td className="px-3 py-2 text-[#484f58] truncate max-w-[140px]">{b.targetUrl.replace(/^https?:\/\/[^/]+/, "") || "/"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="rounded-2xl border-2 border-dashed border-[#21262d] p-8 text-center text-xs text-[#484f58]"><Database className="w-6 h-6 mx-auto mb-2 opacity-30" />No backlink data — upload a Backlinks CSV on the Competitors page</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

type TabId = "gap" | "battle" | "pages" | "backlinks";

export default function KeywordGapPage() {
  const [youProfile, setYouProfile] = useState<DomainProfile | null>(null);
  const [themProfile, setThemProfile] = useState<DomainProfile | null>(null);
  const [youDomain,   setYouDomain]   = useState("Your site");
  const [themDomain,  setThemDomain]  = useState("Competitor");
  const [tab, setTab] = useState<TabId>("gap");
  const [savedAtYou,  setSavedAtYou]  = useState<string | null>(null);
  const [savedAtThem, setSavedAtThem] = useState<string | null>(null);

  useEffect(() => {
    const sy = loadSaved(STORAGE_KEY_YOU);
    const st = loadSaved(STORAGE_KEY_THEM);
    if (sy) { setYouProfile(sy.profile); setYouDomain(sy.domain); setSavedAtYou(sy.savedAt); }
    if (st) { setThemProfile(st.profile); setThemDomain(st.domain); setSavedAtThem(st.savedAt); }
  }, []);

  const gap = useMemo(() => (youProfile && themProfile ? buildKeywordGap(youProfile, themProfile) : []), [youProfile, themProfile]);
  const hasBoth = !!(youProfile && themProfile);
  const hasKw   = (youProfile?.keywords.length ?? 0) > 0 && (themProfile?.keywords.length ?? 0) > 0;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "gap",       label: "Keyword Gap",     count: gap.length },
    { id: "battle",    label: "Ranking Battle",  count: hasKw ? youProfile!.keywords.length : 0 },
    { id: "pages",     label: "Top Pages" },
    { id: "backlinks", label: "Backlinks" },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#e6edf3]">Keyword Gap</h1>
          <p className="text-sm text-[#484f58] mt-1">Compare keyword rankings, find content gaps, and analyse top pages &amp; backlinks.</p>
        </div>
        <Link href="/dashboard/competitors" className="flex items-center gap-1.5 text-xs font-mono text-[#484f58] hover:text-[#00ff88] transition-colors border border-[#21262d] rounded-xl px-3 py-2 hover:border-[#00ff8840]">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
        </Link>
      </div>

      {!hasBoth && (
        <div className="bg-[#161b22] border border-[#e3b34130] rounded-2xl p-6 text-center space-y-3">
          <Database className="w-10 h-10 mx-auto text-[#e3b341] opacity-60" />
          <p className="font-semibold text-[#e3b341]">No competitor data loaded</p>
          <p className="text-sm text-[#6e7681] max-w-sm mx-auto">Upload SEMrush CSV exports on the Competitors page first. Your data is saved in your browser and will appear here automatically.</p>
          <Link href="/dashboard/competitors" className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#00ff8840] text-[#00ff88] hover:bg-[#00ff8810] transition-colors">
            Go to Competitors
          </Link>
        </div>
      )}

      {hasBoth && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#484f58]">
              <span style={{ color: YOU_COLOR }} className="font-semibold">{youDomain}</span>
              {savedAtYou && <span>({formatSavedAt(savedAtYou)})</span>}
              <span className="text-[#30363d]">vs</span>
              <span style={{ color: THEM_COLOR }} className="font-semibold">{themDomain}</span>
              {savedAtThem && <span>({formatSavedAt(savedAtThem)})</span>}
            </div>
          </div>

          <div className="flex gap-2 border-b border-[#21262d] pb-0">
            {tabs.map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-all -mb-px ${tab === id ? "border-[#00ff88] text-[#00ff88] bg-[#00ff8808]" : "border-transparent text-[#6e7681] hover:text-[#c9d1d9]"}`}
              >
                {label}
                {typeof count === "number" && count > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{fmtNum(count)}</span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-5">
            {tab === "gap"       && hasKw && <KeywordGapSection gap={gap} youLabel={youDomain} themLabel={themDomain} />}
            {tab === "gap"       && !hasKw && <p className="text-sm text-[#6e7681] text-center py-8">No keyword CSVs loaded. Upload keyword exports on the Competitors page.</p>}
            {tab === "battle"    && hasKw && <RankingBattleSection you={youProfile!} them={themProfile!} youLabel={youDomain} themLabel={themDomain} />}
            {tab === "battle"    && !hasKw && <p className="text-sm text-[#6e7681] text-center py-8">Requires keyword CSV exports for both domains.</p>}
            {tab === "pages"     && <TopPagesSection you={youProfile!} them={themProfile!} youLabel={youDomain} themLabel={themDomain} />}
            {tab === "backlinks" && <BacklinksSection you={youProfile!} them={themProfile!} youLabel={youDomain} themLabel={themDomain} />}
          </div>
        </>
      )}
    </div>
  );
}
