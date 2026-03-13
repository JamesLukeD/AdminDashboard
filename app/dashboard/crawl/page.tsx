"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  Upload,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  Tag,
  AlignLeft,
  Link2,
  Layers,
  X,
  Copy,
  Check,
  Download,
  ChevronsUpDown,
  Search,
  Zap,
  Clock,
} from "lucide-react";
import { parseSFRows } from "@/lib/screaming-frog";
import type { CrawlSummary, CrawlPage, SFRow } from "@/types/crawl";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend,
} from "recharts";

// ─── helpers ────────────────────────────────────────────────────────────────

function shortUrl(url: string, max = 60) {
  try {
    const u = new URL(url);
    const p = u.pathname + (u.search || "");
    return p.length > max ? p.slice(0, max) + "…" : p || "/";
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

function badge(n: number, warn: number, error: number) {
  if (n === 0) return "bg-[#0a1a12] text-[#56d364]";
  if (n >= error) return "bg-[#1e0a0a] text-[#ff7b72]";
  if (n >= warn) return "bg-amber-100 text-[#e3b341]";
  return "bg-[#0a1420] text-[#79c0ff]";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function IssueBreakdownChart({ summary }: { summary: CrawlSummary }) {
  const items = [
    { label: "4xx/5xx Errors", count: summary.errors.length, color: "#ef4444" },
    { label: "Missing Title", count: summary.missingTitle.length, color: "#ef4444" },
    { label: "Missing H1", count: summary.missingH1.length, color: "#ef4444" },
    { label: "Dup. Titles", count: summary.duplicateTitles.reduce((a, g) => a + g.pages.length, 0), color: "#f59e0b" },
    { label: "Missing Meta", count: summary.missingMeta.length, color: "#f59e0b" },
    { label: "Thin Content", count: summary.thinContent.length, color: "#f59e0b" },
    { label: "Redirects", count: summary.redirects.length, color: "#f97316" },
    { label: "Orphan Pages", count: summary.orphanPages.length, color: "#a855f7" },
    { label: "Deep Pages", count: summary.deepPages.length, color: "#6366f1" },
    { label: "Slow Pages", count: summary.slowPages.length, color: "#3b82f6" },
  ].filter((i) => i.count > 0).sort((a, b) => b.count - a.count);
  if (items.length === 0) return (
    <div className="flex items-center justify-center h-32 text-green-600 font-semibold text-sm gap-2">
      <CheckCircle2 className="w-5 h-5" /> No issues found — site looks great!
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, items.length * 32)}>
      <BarChart data={items} layout="vertical" margin={{ left: 0, right: 40 }} barCategoryGap="20%">
        <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: unknown) => [String(v as number), "issues"]} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {items.map((e, i) => <Cell key={i} fill={e.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatusDonut({ summary }: { summary: CrawlSummary }) {
  const ok200 = summary.totalPages - summary.errors.length - summary.redirects.length;
  const data = [
    { name: "200 OK", value: Math.max(0, ok200), color: "#22c55e" },
    { name: "3xx Redirects", value: summary.redirects.length, color: "#f59e0b" },
    { name: "4xx/5xx Errors", value: summary.errors.length, color: "#ef4444" },
  ].filter((d) => d.value > 0);
  return (
    <div>
      <p className="text-xs font-semibold text-[#484f58] uppercase tracking-wide mb-3">Status Code Mix</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3}>
            {data.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Pie>
          <Tooltip formatter={(v: unknown) => [String(v as number), ""]} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function healthColor(score: number) {
  if (score >= 80) return { ring: "#22c55e", text: "text-green-600", label: "Good" };
  if (score >= 60) return { ring: "#f59e0b", text: "text-amber-600", label: "Needs Work" };
  if (score >= 40) return { ring: "#f97316", text: "text-orange-600", label: "Poor" };
  return { ring: "#ef4444", text: "text-red-600", label: "Critical" };
}

function exportIssuesToCSV(summary: CrawlSummary, fileName: string) {
  const rows: string[] = ["Issue Type,Severity,URL,Title,Status Code,Word Count"];
  const add = (type: string, severity: string, pages: CrawlPage[]) => {
    for (const p of pages) {
      rows.push([type, severity, p.url, `"${(p.title || "").replace(/"/g, '""')}"`, p.statusCode, p.wordCount].join(","));
    }
  };
  add("4xx/5xx Error", "Critical", summary.errors);
  add("Redirect", "Warning", summary.redirects);
  add("Missing Title", "Critical", summary.missingTitle);
  add("Short Title", "Warning", summary.shortTitle);
  add("Long Title", "Info", summary.longTitle);
  add("Missing Meta Description", "Warning", summary.missingMeta);
  add("Short Meta", "Info", summary.shortMeta);
  add("Long Meta", "Info", summary.longMeta);
  add("Missing H1", "Critical", summary.missingH1);
  add("Multiple H1s", "Warning", summary.multipleH1);
  add("Orphan Page", "Warning", summary.orphanPages);
  add("Deep Page (depth >3)", "Info", summary.deepPages);
  add("Non-self Canonical", "Info", summary.nonCanonical);
  add("Thin Content (<300 words)", "Warning", summary.thinContent);
  add("Slow Page (>3s)", "Warning", summary.slowPages);
  for (const g of summary.duplicateTitles) {
    for (const p of g.pages) rows.push(["Duplicate Title", "Warning", p.url, `"${g.title.replace(/"/g, '""')}"`, p.statusCode, p.wordCount].join(","));
  }
  for (const g of summary.duplicateMeta) {
    for (const p of g.pages) rows.push(["Duplicate Meta", "Warning", p.url, `"${(p.title || "").replace(/"/g, '""')}"`, p.statusCode, p.wordCount].join(","));
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `crawl-issues-${fileName.replace(".csv", "")}.csv`;
  a.click();
}

// ─── HealthRing ──────────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const progress = (score / 100) * circ;
  const { ring, text, label } = healthColor(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg className="rotate-[-90deg]" width="112" height="112" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          <circle cx="56" cy="56" r={r} fill="none" stroke={ring} strokeWidth="10"
            strokeDasharray={`${progress} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${text}`}>{score}</span>
          <span className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-wide">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-bold ${text}`}>{label}</span>
      <span className="text-xs text-[#6e7681]">Site Health Score</span>
    </div>
  );
}

// ─── CopyButton ──────────────────────────────────────────────────────────────

function CopyButton({ urls }: { urls: string[] }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(urls.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copy all URLs to clipboard"
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[#161b22]/70 hover:bg-[#161b22] border border-current/20 transition-all">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy URLs"}
    </button>
  );
}

// ─── PriorityCard ────────────────────────────────────────────────────────────

function PriorityCard({ sev, title, detail }: { sev: "error" | "warning" | "info"; title: string; detail: string }) {
  const styles = { error: "bg-[#1e0a0a] border-red-100 text-red-800", warning: "bg-[#1a1200] border-amber-100 text-amber-800", info: "bg-[#0a1420] border-blue-100 text-[#79c0ff]" };
  const detailStyles = { error: "text-red-600", warning: "text-amber-600", info: "text-blue-600" };
  return (
    <div className={`p-3 rounded-xl border ${styles[sev]}`}>
      <p className="font-semibold text-sm">{title}</p>
      <p className={`text-xs mt-0.5 ${detailStyles[sev]}`}>{detail}</p>
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-4 flex items-start gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-[#e6edf3] leading-tight">{value}</p>
        <p className="text-sm font-medium text-[#8b949e] leading-tight">{label}</p>
        {sub && <p className="text-xs text-[#6e7681] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function IssueSection({
  icon: Icon,
  title,
  count,
  severity,
  defaultOpen = false,
  urls,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  severity: "error" | "warning" | "info" | "ok";
  defaultOpen?: boolean;
  urls?: string[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    error: "text-red-600 bg-[#1e0a0a] border-red-200",
    warning: "text-amber-600 bg-[#1a1200] border-amber-200",
    info: "text-blue-600 bg-[#0a1420] border-blue-200",
    ok: "text-green-600 bg-[#0a1a12] border-green-200",
  };
  const badgeColors = {
    error: "bg-[#1e0a0a] text-[#ff7b72]",
    warning: "bg-amber-100 text-[#e3b341]",
    info: "bg-[#0a1420] text-[#79c0ff]",
    ok: "bg-[#0a1a12] text-[#56d364]",
  };
  if (count === 0) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors.ok} text-sm`}>
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span className="font-medium">{title}</span>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0a1a12] text-[#56d364]">✓ None</span>
      </div>
    );
  }
  return (
    <div className={`rounded-2xl border ${colors[severity]} overflow-hidden`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${colors[severity]}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm">{title}</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColors[severity]}`}>
          {count}
        </span>
        {urls && urls.length > 0 && <CopyButton urls={urls} />}
        {open ? (
          <ChevronDown className="w-4 h-4 shrink-0 ml-auto" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 ml-auto" />
        )}
      </button>
      {open && <div className="bg-[#161b22]">{children}</div>}
    </div>
  );
}

type ColId = "status" | "title" | "meta" | "depth" | "inlinks" | "canonical" | "words" | "speed";
type SortDir = "asc" | "desc";

function PageTable({
  pages,
  cols,
}: {
  pages: CrawlPage[];
  cols?: ColId[];
}) {
  const [vis, setVis] = useState(30);
  const [query, setQuery] = useState("");
  const [sortCol, setSortCol] = useState<ColId | "url" | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const show = cols ?? ["status"];

  const toggleSort = (col: ColId | "url") => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const filtered = pages.filter(
    (p) => !query || p.url.toLowerCase().includes(query.toLowerCase()) || p.title.toLowerCase().includes(query.toLowerCase())
  );

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        let av: string | number = 0;
        let bv: string | number = 0;
        if (sortCol === "url") { av = a.url; bv = b.url; }
        else if (sortCol === "status") { av = a.statusCode; bv = b.statusCode; }
        else if (sortCol === "title") { av = a.titleLength; bv = b.titleLength; }
        else if (sortCol === "meta") { av = a.metaDescLength; bv = b.metaDescLength; }
        else if (sortCol === "depth") { av = a.crawlDepth; bv = b.crawlDepth; }
        else if (sortCol === "inlinks") { av = a.inlinks; bv = b.inlinks; }
        else if (sortCol === "words") { av = a.wordCount; bv = b.wordCount; }
        else if (sortCol === "speed") { av = a.responseTime ?? 0; bv = b.responseTime ?? 0; }
        if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
        return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      })
    : filtered;

  const visible = sorted.slice(0, vis);

  const SortTh = ({ label, col }: { label: string; col: ColId | "url" }) => (
    <th className="text-left px-3 py-2 font-semibold cursor-pointer hover:text-[#8b949e] select-none whitespace-nowrap" onClick={() => toggleSort(col)}>
      <span className="flex items-center gap-1">
        {label}
        <ChevronsUpDown className={`w-3 h-3 ${sortCol === col ? "opacity-100 text-brand-500" : "opacity-30"}`} />
      </span>
    </th>
  );

  return (
    <div>
      {pages.length > 10 && (
        <div className="px-4 py-2 border-b border-[#21262d] bg-[#0d1117]/80">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6e7681]" />
            <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setVis(30); }}
              placeholder="Filter by URL or title…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#30363d] focus:outline-none focus:ring-1 focus:ring-brand-500 bg-[#161b22]" />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0d1117] text-[#484f58] uppercase tracking-wide text-[11px]">
              <SortTh label="URL" col="url" />
              {show.includes("status") && <SortTh label="Code" col="status" />}
              {show.includes("title") && <SortTh label="Title (chars)" col="title" />}
              {show.includes("meta") && <SortTh label="Meta (chars)" col="meta" />}
              {show.includes("words") && <SortTh label="Words" col="words" />}
              {show.includes("depth") && <SortTh label="Depth" col="depth" />}
              {show.includes("inlinks") && <SortTh label="Inlinks" col="inlinks" />}
              {show.includes("speed") && <SortTh label="Resp. Time" col="speed" />}
              {show.includes("canonical") && <th className="text-left px-3 py-2 font-semibold">Canonical</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {visible.map((p) => (
              <tr key={p.url} className="hover:bg-[#0d1117] group">
                <td className="px-4 py-2 font-mono text-[#8b949e] max-w-xs">
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="hover:underline text-blue-600 flex items-center gap-1 min-w-0" title={p.url}>
                    <span className="truncate">{shortUrl(p.url)}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </a>
                </td>
                {show.includes("status") && (
                  <td className="px-3 py-2">
                    <span className={`font-bold px-2 py-0.5 rounded-md ${p.statusCode >= 400 ? "bg-[#1e0a0a] text-[#ff7b72]" : p.statusCode >= 300 ? "bg-amber-100 text-[#e3b341]" : "bg-[#0a1a12] text-[#56d364]"}`}>
                      {p.statusCode}
                    </span>
                  </td>
                )}
                {show.includes("title") && (
                  <td className="px-3 py-2 max-w-[200px]" title={p.title}>
                    {p.title
                      ? <span className="text-[#8b949e]">{p.title.length > 40 ? p.title.slice(0, 40) + "…" : p.title} <span className="text-[#6e7681]">({p.titleLength})</span></span>
                      : <span className="italic text-[#30363d]">missing</span>}
                  </td>
                )}
                {show.includes("meta") && (
                  <td className="px-3 py-2 max-w-[200px]" title={p.metaDesc}>
                    {p.metaDesc
                      ? <span className="text-[#8b949e]">{p.metaDesc.length > 40 ? p.metaDesc.slice(0, 40) + "…" : p.metaDesc} <span className="text-[#6e7681]">({p.metaDescLength})</span></span>
                      : <span className="italic text-[#30363d]">missing</span>}
                  </td>
                )}
                {show.includes("words") && (
                  <td className="px-3 py-2 text-center">
                    <span className={`font-medium ${p.wordCount < 300 && p.wordCount > 0 ? "text-amber-600" : "text-[#8b949e]"}`}>{p.wordCount.toLocaleString()}</span>
                  </td>
                )}
                {show.includes("depth") && <td className="px-3 py-2 text-center text-[#8b949e]">{p.crawlDepth}</td>}
                {show.includes("inlinks") && <td className="px-3 py-2 text-center text-[#8b949e]">{p.inlinks}</td>}
                {show.includes("speed") && (
                  <td className="px-3 py-2 text-center">
                    {p.responseTime !== undefined
                      ? <span className={`font-medium ${p.responseTime > 3000 ? "text-red-600" : p.responseTime > 1500 ? "text-amber-600" : "text-green-600"}`}>{formatMs(p.responseTime)}</span>
                      : <span className="text-[#30363d]">—</span>}
                  </td>
                )}
                {show.includes("canonical") && (
                  <td className="px-3 py-2 text-blue-600 max-w-[200px] font-mono truncate" title={p.canonical}>
                    {shortUrl(p.canonical)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && query && (
        <p className="text-center text-xs text-[#6e7681] py-4">No results for &ldquo;{query}&rdquo;</p>
      )}
      {sorted.length > vis && (
        <div className="px-4 py-3 border-t border-[#21262d] bg-[#0d1117] flex items-center justify-between">
          <span className="text-xs text-[#6e7681]">Showing {vis} of {sorted.length}</span>
          <button onClick={() => setVis((v) => v + 30)} className="text-xs text-blue-600 hover:underline font-medium">
            Load 30 more ({sorted.length - vis} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

function DuplicateGroup({
  value,
  pages,
  keyLabel,
}: {
  value: string;
  pages: CrawlPage[];
  keyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(pages.map((p) => p.url).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-b border-[#21262d] last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#0d1117] text-xs"
      >
        <span className="bg-amber-100 text-[#e3b341] font-bold px-2 py-0.5 rounded-full shrink-0">{pages.length}×</span>
        <span className="font-medium text-[#c9d1d9] line-clamp-2 text-xs">{keyLabel}: <span className="text-[#8b949e] font-normal italic">"{value}"</span></span>
        <button onClick={copy} className="ml-auto shrink-0 flex items-center gap-1 text-[#6e7681] hover:text-[#8b949e] transition-colors px-2 py-0.5">
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </button>
        <span className="text-[#30363d] shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1">
          {pages.map((p) => (
            <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-mono">
              {shortUrl(p.url)} <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

type TabId = "overview" | "errors" | "titles" | "meta" | "headings" | "content" | "structure";

export default function CrawlPage() {
  const [summary, setSummary] = useState<CrawlSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("overview");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".tsv")) {
      setError("Please upload a CSV file exported from Screaming Frog.");
      return;
    }
    setLoading(true);
    setError("");
    setFileName(file.name);
    setFileSize(file.size);
    Papa.parse<SFRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        try {
          const s = parseSFRows(results.data);
          setSummary(s);
          setTab("overview");
        } catch (e) {
          setError("Failed to parse the file. Make sure you exported the Internal HTML tab from Screaming Frog.");
          console.error(e);
        }
        setLoading(false);
      },
      error(err) {
        setError(`Parse error: ${err.message}`);
        setLoading(false);
      },
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const reset = () => {
    setSummary(null);
    setFileName("");
    setFileSize(0);
    setTab("overview");
    if (inputRef.current) inputRef.current.value = "";
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = summary
    ? [
        { id: "overview", label: "Overview", icon: Globe },
        { id: "errors", label: "Errors & Redirects", icon: AlertCircle, count: summary.errors.length + summary.redirects.length },
        { id: "titles", label: "Page Titles", icon: Tag, count: summary.missingTitle.length + summary.duplicateTitles.length + summary.shortTitle.length + summary.longTitle.length },
        { id: "meta", label: "Meta Descriptions", icon: AlignLeft, count: summary.missingMeta.length + summary.duplicateMeta.length + summary.shortMeta.length + summary.longMeta.length },
        { id: "headings", label: "H1 Headings", icon: FileText, count: summary.missingH1.length + summary.multipleH1.length },
        { id: "content", label: "Content", icon: Zap, count: summary.thinContent.length + summary.slowPages.length },
        { id: "structure", label: "Site Structure", icon: Layers, count: summary.deepPages.length + summary.orphanPages.length + summary.nonCanonical.length },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">Site Crawl Analysis</h1>
          <p className="text-sm text-[#484f58] mt-1">
            Upload a Screaming Frog CSV export to audit technical SEO issues across your site.
          </p>
        </div>
        {summary && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportIssuesToCSV(summary, fileName)}
              className="flex items-center gap-2 text-sm text-white bg-brand-500 hover:bg-brand-600 rounded-xl px-4 py-2 transition-colors font-medium"
            >
              <Download className="w-4 h-4" /> Export Issues CSV
            </button>
            <button onClick={reset} className="flex items-center gap-2 text-sm text-[#484f58] hover:text-[#8b949e] border border-[#30363d] rounded-xl px-3 py-2 transition-colors">
              <X className="w-4 h-4" /> New Upload
            </button>
          </div>
        )}
      </div>

      {/* ── Upload zone ── */}
      {!summary && (
        <>
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 text-center transition-all cursor-pointer ${
              isDragOver
                ? "border-brand-500 bg-[#1a0e00] scale-[1.01] shadow-lg"
                : "border-[#30363d] hover:border-brand-400 hover:bg-[#1a0e00]/20"
            }`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragOver ? "bg-brand-500 scale-110" : "bg-brand-500/10"}`}>
              <Upload className={`w-8 h-8 transition-colors ${isDragOver ? "text-white" : "text-brand-500"}`} />
            </div>
            <div>
              <p className="font-semibold text-[#c9d1d9] text-lg">
                {isDragOver ? "Drop to analyse…" : "Drop your Screaming Frog CSV here"}
              </p>
              <p className="text-sm text-[#484f58] mt-1">
                Or click to browse. Use <strong>File → Export → All</strong> on the <strong>Internal</strong> tab.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-[#6e7681]">
              {["404s & broken links", "Missing titles & meta", "Duplicate content", "Thin content (<300 words)", "Redirect chains", "Orphan & deep pages"].map((t) => (
                <span key={t} className="bg-[#161b22] rounded-full px-3 py-1">✓ {t}</span>
              ))}
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-brand-500 font-medium">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Parsing {fileName}…
              </div>
            )}
            {error && <p className="text-sm text-red-600 bg-[#1e0a0a] border border-red-200 rounded-xl px-4 py-2">{error}</p>}
            <input ref={inputRef} type="file" accept=".csv,.tsv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
          </div>

          <div className="bg-[#0a1420] border border-blue-100 rounded-2xl p-4 text-sm text-[#79c0ff] flex gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
            <div className="space-y-1">
              <p className="font-semibold">How to export from Screaming Frog</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[#79c0ff]">
                <li>Run a crawl of <strong>cawardenreclaim.co.uk</strong></li>
                <li>Select the <strong>Internal</strong> tab at the top</li>
                <li>Go to <strong>Export → All</strong> (or Ctrl+Shift+E)</li>
                <li>Save as CSV and upload here</li>
              </ol>
            </div>
          </div>
        </>
      )}

      {/* ── Results ── */}
      {summary && (
        <>
          {/* File metadata */}
          <div className="flex items-center gap-3 text-sm text-[#484f58] bg-[#0d1117] rounded-xl px-4 py-2.5 border border-[#21262d]">
            <FileText className="w-4 h-4 text-[#6e7681]" />
            <span className="font-medium text-[#8b949e]">{fileName}</span>
            <span className="text-[#30363d]">·</span>
            <span>{formatBytes(fileSize)}</span>
            <span className="text-[#30363d]">·</span>
            <span>{summary.totalPages.toLocaleString()} pages crawled</span>
          </div>

          {/* Health score + KPI strip */}
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <HealthRing score={summary.healthScore} />
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
                {[
                  { label: "Indexable", value: summary.indexable, sub: `${Math.round((summary.indexable / summary.totalPages) * 100)}% of total`, bg: "bg-[#0a1a12]", text: "text-[#56d364]" },
                  { label: "4xx Errors", value: summary.errors.filter((p) => p.statusCode < 500).length, bg: summary.errors.length > 0 ? "bg-[#1e0a0a]" : "bg-[#0d1117]", text: summary.errors.length > 0 ? "text-[#ff7b72]" : "text-[#6e7681]" },
                  { label: "Missing Title", value: summary.missingTitle.length, bg: summary.missingTitle.length > 0 ? "bg-[#1e0a0a]" : "bg-[#0d1117]", text: summary.missingTitle.length > 0 ? "text-[#ff7b72]" : "text-[#6e7681]" },
                  { label: "Thin Content", value: summary.thinContent.length, bg: summary.thinContent.length > 0 ? "bg-[#1a1200]" : "bg-[#0d1117]", text: summary.thinContent.length > 0 ? "text-[#e3b341]" : "text-[#6e7681]" },
                  { label: "Orphan Pages", value: summary.orphanPages.length, bg: summary.orphanPages.length > 0 ? "bg-[#1a1200]" : "bg-[#0d1117]", text: summary.orphanPages.length > 0 ? "text-[#e3b341]" : "text-[#6e7681]" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl px-4 py-3 ${s.bg}`}>
                    <p className={`text-2xl font-black ${s.text}`}>{s.value.toLocaleString()}</p>
                    <p className="text-xs font-medium text-[#8b949e] mt-0.5">{s.label}</p>
                    {s.sub && <p className="text-[10px] text-[#6e7681]">{s.sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-[#30363d]">
            <div className="flex gap-0.5 overflow-x-auto pb-0 -mb-px">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    tab === t.id ? "border-brand-500 text-brand-600" : "border-transparent text-[#484f58] hover:text-[#8b949e]"
                  }`}
                >
                  <t.icon className="w-4 h-4 shrink-0" />
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.count > 10 ? "bg-[#1e0a0a] text-[#ff7b72]" : "bg-amber-100 text-[#e3b341]"}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="space-y-3">

            {/* ── Overview ── */}
            {tab === "overview" && (
              <div className="space-y-4">
                {/* Visual issue chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-[#161b22] rounded-2xl border border-[#21262d] p-5 shadow-sm">
                    <h3 className="font-semibold text-[#c9d1d9] mb-1">Issue Breakdown</h3>
                    <p className="text-xs text-[#6e7681] mb-4">All issues found — sorted by count, colour-coded by severity</p>
                    <IssueBreakdownChart summary={summary} />
                  </div>
                  <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-5 shadow-sm">
                    <StatusDonut summary={summary} />
                    <div className="mt-4 space-y-1.5">
                      {[
                        { label: "Total pages", value: summary.totalPages, color: "text-[#8b949e]" },
                        { label: "Indexable", value: summary.indexable, color: "text-[#56d364]" },
                        { label: "Non-indexable", value: summary.totalPages - summary.indexable, color: "text-[#6e7681]" },
                      ].map((r) => (
                        <div key={r.label} className="flex items-center justify-between text-sm">
                          <span className="text-[#484f58]">{r.label}</span>
                          <span className={`font-bold ${r.color}`}>{r.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Highest priority fixes */}
                <div className="bg-[#161b22] rounded-2xl border border-[#21262d] p-5 shadow-sm">
                  <h3 className="font-semibold text-[#c9d1d9] mb-4">Highest Priority Fixes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {summary.errors.length > 0 && <PriorityCard sev="error" title={`Fix ${summary.errors.length} broken page${summary.errors.length > 1 ? "s" : ""} (4xx/5xx)`} detail="Broken pages waste crawl budget and may have inbound links pointing to them." />}
                    {summary.missingTitle.length > 0 && <PriorityCard sev="error" title={`Add titles to ${summary.missingTitle.length} page${summary.missingTitle.length > 1 ? "s" : ""}`} detail="Missing titles are a critical on-page SEO issue and hurt click-through rates." />}
                    {summary.missingH1.length > 0 && <PriorityCard sev="error" title={`Add H1 to ${summary.missingH1.length} page${summary.missingH1.length > 1 ? "s" : ""}`} detail="H1 headings are the primary content relevance signal for search engines." />}
                    {summary.duplicateTitles.length > 0 && <PriorityCard sev="warning" title={`Resolve ${summary.duplicateTitles.length} duplicate title group${summary.duplicateTitles.length > 1 ? "s" : ""}`} detail="Duplicate titles cause keyword cannibalisation and split ranking signals." />}
                    {summary.thinContent.length > 0 && <PriorityCard sev="warning" title={`Expand ${summary.thinContent.length} thin content page${summary.thinContent.length > 1 ? "s" : ""}`} detail="Pages with fewer than 300 words rarely rank well for competitive queries." />}
                    {summary.missingMeta.length > 0 && <PriorityCard sev="warning" title={`Write meta descriptions for ${summary.missingMeta.length} page${summary.missingMeta.length > 1 ? "s" : ""}`} detail="Meta descriptions directly improve click-through rates from search results." />}
                    {summary.orphanPages.length > 0 && <PriorityCard sev="info" title={`Link to ${summary.orphanPages.length} orphan page${summary.orphanPages.length > 1 ? "s" : ""}`} detail="Pages with no inlinks receive minimal PageRank and may not be re-crawled." />}
                    {summary.errors.length === 0 && summary.missingTitle.length === 0 && summary.missingH1.length === 0 && summary.duplicateTitles.length === 0 && summary.thinContent.length === 0 && summary.missingMeta.length === 0 && summary.orphanPages.length === 0 && (
                      <div className="p-3 rounded-xl bg-[#0a1a12] border border-green-100 text-[#56d364] col-span-2">
                        <p className="font-semibold">No critical issues found 🎉</p>
                        <p className="text-xs mt-0.5 text-green-600">Your site is in great shape. Check the other tabs for minor improvements.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Errors ── */}
            {tab === "errors" && (
              <div className="space-y-3">
                <IssueSection icon={AlertCircle} title="404 Not Found" count={summary.errors.filter((p) => p.statusCode === 404).length} severity="error" defaultOpen={summary.errors.filter((p) => p.statusCode === 404).length > 0} urls={summary.errors.filter((p) => p.statusCode === 404).map((p) => p.url)}>
                  <PageTable pages={summary.errors.filter((p) => p.statusCode === 404)} cols={["status", "title", "inlinks"]} />
                </IssueSection>
                <IssueSection icon={AlertCircle} title="Other 4xx Errors" count={summary.errors.filter((p) => p.statusCode >= 400 && p.statusCode < 500 && p.statusCode !== 404).length} severity="error" defaultOpen={summary.errors.filter((p) => p.statusCode >= 400 && p.statusCode < 500 && p.statusCode !== 404).length > 0} urls={summary.errors.filter((p) => p.statusCode >= 400 && p.statusCode < 500 && p.statusCode !== 404).map((p) => p.url)}>
                  <PageTable pages={summary.errors.filter((p) => p.statusCode >= 400 && p.statusCode < 500 && p.statusCode !== 404)} cols={["status"]} />
                </IssueSection>
                <IssueSection icon={AlertCircle} title="5xx Server Errors" count={summary.errors.filter((p) => p.statusCode >= 500).length} severity="error" defaultOpen={summary.errors.filter((p) => p.statusCode >= 500).length > 0} urls={summary.errors.filter((p) => p.statusCode >= 500).map((p) => p.url)}>
                  <PageTable pages={summary.errors.filter((p) => p.statusCode >= 500)} cols={["status"]} />
                </IssueSection>
                <IssueSection icon={AlertTriangle} title="3xx Redirects" count={summary.redirects.length} severity="warning" defaultOpen={summary.redirects.length > 0} urls={summary.redirects.map((p) => p.url)}>
                  <PageTable pages={summary.redirects} cols={["status", "title"]} />
                </IssueSection>
              </div>
            )}

            {/* ── Titles ── */}
            {tab === "titles" && (
              <div className="space-y-3">
                <IssueSection icon={AlertCircle} title="Missing Title Tag" count={summary.missingTitle.length} severity="error" defaultOpen urls={summary.missingTitle.map((p) => p.url)}>
                  <PageTable pages={summary.missingTitle} cols={["title", "depth"]} />
                </IssueSection>
                <IssueSection icon={AlertTriangle} title="Duplicate Titles" count={summary.duplicateTitles.reduce((a, g) => a + g.pages.length, 0)} severity="warning" urls={summary.duplicateTitles.flatMap((g) => g.pages.map((p) => p.url))}>
                  <div className="divide-y divide-[#21262d]">
                    {summary.duplicateTitles.map((g) => <DuplicateGroup key={g.title} value={g.title} pages={g.pages} keyLabel="Title" />)}
                  </div>
                </IssueSection>
                <IssueSection icon={AlertTriangle} title="Title Too Short (< 30 chars)" count={summary.shortTitle.length} severity="warning" urls={summary.shortTitle.map((p) => p.url)}>
                  <PageTable pages={summary.shortTitle} cols={["title"]} />
                </IssueSection>
                <IssueSection icon={Info} title="Title Too Long (> 60 chars)" count={summary.longTitle.length} severity="info" urls={summary.longTitle.map((p) => p.url)}>
                  <PageTable pages={summary.longTitle} cols={["title"]} />
                </IssueSection>
              </div>
            )}

            {/* ── Meta ── */}
            {tab === "meta" && (
              <div className="space-y-3">
                <IssueSection icon={AlertTriangle} title="Missing Meta Description" count={summary.missingMeta.length} severity="warning" defaultOpen urls={summary.missingMeta.map((p) => p.url)}>
                  <PageTable pages={summary.missingMeta} cols={["title", "meta"]} />
                </IssueSection>
                <IssueSection icon={AlertTriangle} title="Duplicate Meta Descriptions" count={summary.duplicateMeta.reduce((a, g) => a + g.pages.length, 0)} severity="warning" urls={summary.duplicateMeta.flatMap((g) => g.pages.map((p) => p.url))}>
                  <div className="divide-y divide-[#21262d]">
                    {summary.duplicateMeta.map((g) => <DuplicateGroup key={g.meta} value={g.meta} pages={g.pages} keyLabel="Meta" />)}
                  </div>
                </IssueSection>
                <IssueSection icon={Info} title="Meta Too Short (< 70 chars)" count={summary.shortMeta.length} severity="info" urls={summary.shortMeta.map((p) => p.url)}>
                  <PageTable pages={summary.shortMeta} cols={["title", "meta"]} />
                </IssueSection>
                <IssueSection icon={Info} title="Meta Too Long (> 155 chars)" count={summary.longMeta.length} severity="info" urls={summary.longMeta.map((p) => p.url)}>
                  <PageTable pages={summary.longMeta} cols={["title", "meta"]} />
                </IssueSection>
              </div>
            )}

            {/* ── Headings ── */}
            {tab === "headings" && (
              <div className="space-y-3">
                <IssueSection icon={AlertCircle} title="Missing H1" count={summary.missingH1.length} severity="error" defaultOpen urls={summary.missingH1.map((p) => p.url)}>
                  <PageTable pages={summary.missingH1} cols={["title", "depth"]} />
                </IssueSection>
                <IssueSection icon={AlertTriangle} title="Multiple H1s on Same Page" count={summary.multipleH1.length} severity="warning" urls={summary.multipleH1.map((p) => p.url)}>
                  <PageTable pages={summary.multipleH1} cols={["title"]} />
                </IssueSection>
              </div>
            )}

            {/* ── Content ── */}
            {tab === "content" && (
              <div className="space-y-3">
                <IssueSection icon={Zap} title="Thin Content (< 300 words)" count={summary.thinContent.length} severity="warning" defaultOpen urls={summary.thinContent.map((p) => p.url)}>
                  <div className="px-4 py-2 bg-[#1a1200]/50 border-b border-amber-100 text-xs text-[#e3b341]">
                    Pages with fewer than 300 words rarely rank for competitive queries. Consider expanding content or consolidating pages with similar topics.
                  </div>
                  <PageTable pages={summary.thinContent} cols={["words", "title", "inlinks"]} />
                </IssueSection>
                <IssueSection icon={Clock} title="Slow Pages (response time > 3s)" count={summary.slowPages.length} severity={summary.slowPages.length > 0 ? "warning" : "ok"} urls={summary.slowPages.map((p) => p.url)}>
                  {summary.slowPages.length === 0
                    ? <p className="text-xs text-[#6e7681] px-4 py-3">No response time data in this export, or no pages exceeded 3s. Enable response times in Screaming Frog crawl settings for this check.</p>
                    : <PageTable pages={summary.slowPages} cols={["speed", "title"]} />}
                </IssueSection>
              </div>
            )}

            {/* ── Structure ── */}
            {tab === "structure" && (
              <div className="space-y-3">
                <IssueSection icon={AlertTriangle} title="Orphan Pages (0 internal inlinks)" count={summary.orphanPages.length} severity="warning" defaultOpen urls={summary.orphanPages.map((p) => p.url)}>
                  <div className="px-4 py-2 bg-[#1a1200]/50 border-b border-amber-100 text-xs text-[#e3b341]">
                    These pages have no internal links pointing to them. Google may never crawl or rank them. Add links from topically related pages.
                  </div>
                  <PageTable pages={summary.orphanPages} cols={["inlinks", "depth", "title"]} />
                </IssueSection>
                <IssueSection icon={Info} title="Deep Pages (crawl depth > 3)" count={summary.deepPages.length} severity="info" urls={summary.deepPages.map((p) => p.url)}>
                  <PageTable pages={summary.deepPages} cols={["depth", "inlinks"]} />
                </IssueSection>
                <IssueSection icon={Info} title="Non-self Canonical" count={summary.nonCanonical.length} severity="info" urls={summary.nonCanonical.map((p) => p.url)}>
                  <PageTable pages={summary.nonCanonical} cols={["canonical"]} />
                </IssueSection>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}
