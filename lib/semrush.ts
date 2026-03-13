import type {
  SemrushExportType,
  SemrushKeyword,
  SemrushBacklink,
  SemrushTopPage,
  DomainProfile,
  CompetitorGap,
} from "@/types/competitor";

// ─── Export type detection ────────────────────────────────────────────────────

export function detectExportType(headers: string[]): SemrushExportType {
  const h = new Set(headers.map((s) => s.trim().toLowerCase()));
  if (h.has("keyword") && h.has("position") && h.has("search volume")) return "keywords";
  if (h.has("source url") && h.has("anchor")) return "backlinks";
  // V1: "URL" + "Traffic %" | V2: "URL" + "Traffic (%)" or "Number of Keywords"
  const hasUrl = h.has("url") || h.has("page url");
  const hasPageSignal =
    h.has("top keyword") ||
    h.has("traffic %") ||
    h.has("traffic (%)") ||
    h.has("organic traffic") ||
    h.has("organic keywords") ||
    h.has("number of keywords") ||
    h.has("keywords");
  if (hasUrl && hasPageSignal) return "pages";
  return "unknown";
}

// ─── Row parsers ──────────────────────────────────────────────────────────────

function num(v: string | undefined): number {
  if (!v) return 0;
  // SEMrush uses commas as thousand separators, and may use N/A
  const clean = v.replace(/,/g, "").replace(/[^0-9.]/g, "");
  return clean ? parseFloat(clean) : 0;
}

function parseKeywords(rows: Record<string, string>[]): SemrushKeyword[] {
  return rows
    .map((r) => {
      const pos = num(r["Position"]);
      if (!r["Keyword"] || pos === 0) return null;
      return {
        keyword: r["Keyword"].trim(),
        position: pos,
        prevPosition: r["Previous Position"] && r["Previous Position"] !== "N/A" ? num(r["Previous Position"]) : null,
        searchVolume: num(r["Search Volume"]),
        kd: num(r["Keyword Difficulty"]),
        cpc: num(r["CPC (USD)"]),
        url: r["URL"] || "",
        trafficPct: num(r["Traffic (%)"]),
        traffic: num(r["Traffic"]),
      };
    })
    .filter((x): x is SemrushKeyword => x !== null);
}

function parseBacklinks(rows: Record<string, string>[]): SemrushBacklink[] {
  return rows
    .filter((r) => r["Source URL"] && r["Target URL"])
    .map((r) => ({
      pageScore: num(r["Page Score"]),
      sourceUrl: r["Source URL"] || "",
      sourceTitle: r["Source title"] || "",
      targetUrl: r["Target URL"] || "",
      anchor: r["Anchor"] || "",
      type: r["Type"] || "text",
      nofollow: (r["Nofollow"] || "").toLowerCase() === "true",
      firstSeen: r["First seen"] || "",
      lastSeen: r["Last seen"] || "",
    }));
}

function parseTopPages(rows: Record<string, string>[]): SemrushTopPage[] {
  return rows
    .filter((r) => r["URL"] || r["Page URL"])
    .map((r) => {
      const url = r["Page URL"] || r["URL"] || "";
      // Traffic column variations
      const traffic = num(r["Traffic"] ?? r["Organic Traffic"] ?? "");
      // Keywords column variations
      const keywords = num(
        r["Number of Keywords"] ??
        r["Organic Keywords"] ??
        r["Keywords"] ??
        ""
      );
      // Traffic % column variations — SEMrush uses "Traffic (%)" or "Traffic %"
      const trafficPct = num(
        r["Traffic (%)"] ??
        r["Traffic %"] ??
        r["Organic Traffic %"] ??
        ""
      );
      const topKeyword =
        r["Top Keyword by Traffic"] ||
        r["Top keyword by traffic"] ||
        r["Top Keyword"] ||
        "";
      const topKeywordPosition = num(
        r["Top Keyword Position"] ??
        r["Top keyword position"] ??
        ""
      );
      const topKeywordVolume = num(
        r["Top Keyword Search Volume"] ??
        r["Top Keyword Volume"] ??
        r["Top keyword search volume"] ??
        ""
      );
      return {
        url,
        trafficPct,
        traffic,
        keywords,
        backlinks: num(r["Backlinks"] ?? ""),
        topKeyword,
        topKeywordPosition,
        topKeywordVolume,
      };
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Merge one or more parsed SEMrush CSV payloads into a DomainProfile.
 * Call once per domain, passing each upload individually.
 */
export function buildDomainProfile(
  domain: string,
  existing: DomainProfile | null,
  type: SemrushExportType,
  rows: Record<string, string>[]
): DomainProfile {
  const base: DomainProfile = existing ?? {
    domain,
    keywords: [],
    backlinks: [],
    topPages: [],
    totalTraffic: 0,
    totalKeywords: 0,
    avgPosition: 0,
    top3Count: 0,
    top10Count: 0,
    top3Traffic: 0,
  };

  if (type === "keywords") {
    const kws = parseKeywords(rows);
    base.keywords = kws;
    base.totalKeywords = kws.length;
    base.totalTraffic = kws.reduce((s, k) => s + k.traffic, 0);
    base.top3Count = kws.filter((k) => k.position <= 3).length;
    base.top10Count = kws.filter((k) => k.position <= 10).length;
    base.top3Traffic = kws.filter((k) => k.position <= 3).reduce((s, k) => s + k.traffic, 0);
    base.avgPosition = kws.length
      ? Math.round((kws.reduce((s, k) => s + k.position, 0) / kws.length) * 10) / 10
      : 0;
  } else if (type === "backlinks") {
    base.backlinks = parseBacklinks(rows);
  } else if (type === "pages") {
    base.topPages = parseTopPages(rows);
  }

  return base;
}

// ─── Analysis functions ───────────────────────────────────────────────────────

export function buildKeywordGap(you: DomainProfile, them: DomainProfile): CompetitorGap[] {
  const yourMap = new Map(you.keywords.map((k) => [k.keyword.toLowerCase(), k]));
  const theirMap = new Map(them.keywords.map((k) => [k.keyword.toLowerCase(), k]));

  const allKeywords = new Set([...yourMap.keys(), ...theirMap.keys()]);
  const results: CompetitorGap[] = [];

  for (const kw of allKeywords) {
    const yours = yourMap.get(kw);
    const theirs = theirMap.get(kw);
    const sv = theirs?.searchVolume ?? yours?.searchVolume ?? 0;
    const kd = theirs?.kd ?? yours?.kd ?? 0;

    let opportunity: CompetitorGap["opportunity"];
    if (!yours && theirs) {
      opportunity = "gap"; // they rank, you don't
    } else if (!theirs && yours) {
      opportunity = "ahead"; // you rank, they don't
    } else if (yours && theirs) {
      if (yours.position < theirs.position) {
        opportunity = "ahead";
      } else if (yours.position > theirs.position) {
        opportunity = "behind";
      } else {
        opportunity = "tied";
      }
    } else {
      continue;
    }

    results.push({
      keyword: theirs?.keyword ?? yours?.keyword ?? kw,
      searchVolume: sv,
      kd,
      yourPosition: yours?.position ?? null,
      yourUrl: yours?.url ?? "",
      theirPosition: theirs?.position ?? null,
      theirUrl: theirs?.url ?? "",
      opportunity,
    });
  }

  // Sort: gaps first (biggest opportunity), then behind, then ahead
  const opOrder: Record<CompetitorGap["opportunity"], number> = {
    gap: 0,
    behind: 1,
    tied: 2,
    ahead: 3,
  };
  return results.sort((a, b) => {
    const od = opOrder[a.opportunity] - opOrder[b.opportunity];
    if (od !== 0) return od;
    return b.searchVolume - a.searchVolume;
  });
}

export function getBacklinkStats(profile: DomainProfile) {
  const unique = new Set(profile.backlinks.map((b) => {
    try { return new URL(b.sourceUrl).hostname; } catch { return b.sourceUrl; }
  }));
  const dofollow = profile.backlinks.filter((b) => !b.nofollow).length;
  const nofollow = profile.backlinks.filter((b) => b.nofollow).length;
  return {
    total: profile.backlinks.length,
    uniqueDomains: unique.size,
    dofollow,
    nofollow,
  };
}
