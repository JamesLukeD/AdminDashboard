"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowLeft, Globe, Cpu } from "lucide-react";
import { TRACKED_COMPETITORS } from "@/lib/tracked-competitors";
import type { TechItem } from "@/app/api/page-analyser/route";

type Status = "idle" | "loading" | "done" | "error";

const TECH_CAT_ORDER: TechItem["category"][] = [
  "CMS", "Framework", "Analytics", "Advertising", "E-commerce",
  "Live Chat", "SEO Tool", "CSS", "Fonts", "CDN", "Consent", "Other",
];

const TECH_CAT_LABELS: Record<TechItem["category"], string> = {
  CMS:          "CMS / Platform",
  Framework:    "JS Framework",
  Analytics:    "Analytics",
  Advertising:  "Advertising",
  "E-commerce": "E-commerce & Payments",
  "Live Chat":  "Live Chat & Support",
  "SEO Tool":   "SEO Tools",
  CSS:          "CSS Framework",
  Fonts:        "Fonts",
  CDN:          "CDN & Hosting",
  Consent:      "Cookie / Consent",
  Other:        "Other",
};

const TECH_CAT_COLORS: Record<TechItem["category"], { bg: string; text: string; border: string }> = {
  CMS:          { bg: "#7c3aed15", text: "#a78bfa", border: "#7c3aed30" },
  Framework:    { bg: "#2563eb15", text: "#60a5fa", border: "#2563eb30" },
  Analytics:    { bg: "#0891b215", text: "#22d3ee", border: "#0891b230" },
  Advertising:  { bg: "#dc262615", text: "#f87171", border: "#dc262630" },
  "E-commerce": { bg: "#d9770615", text: "#fb923c", border: "#d9770630" },
  "Live Chat":  { bg: "#05966915", text: "#34d399", border: "#05966930" },
  "SEO Tool":   { bg: "#ca8a0415", text: "#fbbf24", border: "#ca8a0430" },
  CSS:          { bg: "#db277715", text: "#f472b6", border: "#db277730" },
  Fonts:        { bg: "#57534e15", text: "#a8a29e", border: "#57534e30" },
  CDN:          { bg: "#15803d15", text: "#4ade80", border: "#15803d30" },
  Consent:      { bg: "#37415115", text: "#9ca3af", border: "#37415130" },
  Other:        { bg: "#1e293b",   text: "#94a3b8", border: "#334155"   },
};

const QUICK_SITES = [
  { label: "Cawarden", url: "https://cawardenreclaim.co.uk" },
  ...TRACKED_COMPETITORS.map(c => ({ label: c.name, url: `https://${c.url}` })),
];

export default function TechStackPage() {
  const [url,      setUrl]      = useState("https://cawardenreclaim.co.uk");
  const [status,   setStatus]   = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [tech,     setTech]     = useState<TechItem[]>([]);
  const [scannedHost, setScannedHost] = useState("");

  const scan = async (targetUrl?: string) => {
    const u = (targetUrl ?? url).trim();
    if (!u) return;
    if (targetUrl) setUrl(targetUrl);
    setStatus("loading"); setErrorMsg(""); setTech([]);

    try {
      const res  = await fetch("/api/tech-stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json() as { techStack?: TechItem[]; hostname?: string; error?: string };
      if (!res.ok || data.error) { setErrorMsg(String(data.error ?? "Unknown error")); setStatus("error"); return; }
      setTech(data.techStack ?? []);
      setScannedHost(data.hostname ?? u);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  // Group by category
  const categoryMap = new Map<TechItem["category"], TechItem[]>();
  tech.forEach(item => {
    if (!categoryMap.has(item.category)) categoryMap.set(item.category, []);
    categoryMap.get(item.category)!.push(item);
  });
  const orderedCats = TECH_CAT_ORDER.filter(c => categoryMap.has(c));

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#e6edf3]">Tech Stack Scanner</h1>
          <p className="text-sm text-[#484f58] mt-1">
            Scan any website to see what CMS, analytics, ads, tracking, and other tools they&apos;re running.
          </p>
        </div>
        <Link
          href="/dashboard/competitors"
          className="flex items-center gap-1.5 text-xs font-mono text-[#484f58] hover:text-[#00ff88] transition-colors border border-[#21262d] rounded-xl px-3 py-2 hover:border-[#00ff8840]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
      </div>

      {/* Input */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border border-[#21262d] rounded-xl px-3 py-2.5" style={{ background: "#0d1117" }}>
          <Globe className="w-4 h-4 shrink-0 text-[#484f58]" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") scan(); }}
            placeholder="https://example.co.uk"
            className="flex-1 bg-transparent text-sm text-[#c9d1d9] focus:outline-none font-mono placeholder:text-[#30363d]"
          />
        </div>

        {/* Quick picks */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#484f58]">Quick scan</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SITES.map(s => (
              <button
                key={s.url}
                onClick={() => scan(s.url)}
                disabled={status === "loading"}
                className="text-xs px-3 py-1 rounded-lg border transition-colors disabled:opacity-40"
                style={{
                  borderColor: url === s.url ? "#00ff8840" : "#21262d",
                  color:       url === s.url ? "#00ff88"  : "#6e7681",
                  background:  url === s.url ? "#00ff8808" : "transparent",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => scan()}
          disabled={!url.trim() || status === "loading"}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: status === "loading" ? "#00ff8830" : "#00ff88", color: "#0a0e14" }}
        >
          {status === "loading" ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              Scanning…
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Scan Site
            </>
          )}
        </button>

        {status === "error" && (
          <p className="text-xs text-[#ff7b72] font-mono bg-[#ff7b7210] border border-[#ff7b7230] rounded-xl px-3 py-2">{errorMsg}</p>
        )}
      </div>

      {/* Results */}
      {status === "done" && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center gap-3 px-1">
            <Cpu className="w-4 h-4 text-[#a78bfa]" />
            <p className="text-sm font-semibold text-[#c9d1d9]">
              {tech.length} technologies detected on <span className="font-mono text-[#00ff88]">{scannedHost}</span>
            </p>
          </div>

          {tech.length === 0 ? (
            <div className="bg-[#0d1117] border border-[#21262d] rounded-2xl p-8 text-center">
              <Cpu className="w-8 h-8 text-[#21262d] mx-auto mb-3" />
              <p className="text-sm text-[#484f58]">No recognisable technologies detected.</p>
              <p className="text-xs text-[#30363d] mt-1">The site may use custom or fully server-rendered code.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orderedCats.map(cat => {
                const items = categoryMap.get(cat)!;
                const colors = TECH_CAT_COLORS[cat];
                return (
                  <div key={cat} className="bg-[#0d1117] border border-[#21262d] rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-[#21262d] flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.text }}>
                        {TECH_CAT_LABELS[cat]}
                      </span>
                      <span className="text-[10px] font-mono text-[#484f58]">{items.length}</span>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2">
                      {items.map(item => (
                        <span
                          key={item.name}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border"
                          style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
                        >
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-[#30363d] px-1">
            Detection uses publicly visible HTML, script sources, and meta tags only — server-side tech and private tools won&apos;t appear.
          </p>
        </div>
      )}
    </div>
  );
}
