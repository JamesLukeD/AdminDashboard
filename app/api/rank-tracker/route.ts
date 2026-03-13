import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuth } from "@/lib/google-auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KeywordRankRow {
  keyword: string;
  position: number | null;          // avg position current period, null = no data
  prevPosition: number | null;       // avg position previous period
  positionChange: number | null;     // negative = improved (lower position number)
  clicks: number;
  impressions: number;
  ctr: number;                       // percentage 0-100
  topPage: string | null;            // URL that gets the most impressions for this kw
  isTracked: boolean;                // true = from the preset list
}

export interface RankTrackerResponse {
  rows: KeywordRankRow[];
  asOf: string;                      // ISO timestamp
  period: string;                    // e.g. "28d"
  error?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const GSC_SITE_URL = process.env.GSC_SITE_URL ?? "https://cawardenreclaim.co.uk/";

// James's priority keyword list — always included
export const DEFAULT_KEYWORDS = [
  "reclaimed ridge tiles",
  "reclaimed roof tiles",
  "reclaimed clay roof tiles",
  "reclaimed clay tiles",
  "reclaimed slate tiles",
  "reclaimed chimney pots",
  "antique chimney pots",
  "chimney pots",
  "reclaimed cobblestones",
  "cobblestones",
  "reclaimed yorkstone",
  "yorkstone paving",
  "reclaimed yorkstone paving",
  "reclaimed granite setts",
  "reclaimed stone flags",
  "reclaimed stone paving",
  "reclaimed brick slips",
  "reclaimed bricks",
  "reclaimed terracotta tiles",
  "reclaimed floor tiles",
  "reclaimed pavers",
  "reclaimed clay pavers",
  "reclaimed oak beams",
  "reclaimed timber",
  "reclaimed floorboards",
  "reclaimed parquet flooring",
  "architectural salvage",
  "reclaimed building materials",
  "salvage yard yorkshire",
  "reclaimed materials suppliers uk",
];

// ── In-memory cache ───────────────────────────────────────────────────────────

interface CacheEntry { data: RankTrackerResponse; expiresAt: number }
const cache = new Map<string, CacheEntry>();

// ── Date helpers ──────────────────────────────────────────────────────────────

function daysAgoDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ── GSC fetch ─────────────────────────────────────────────────────────────────

interface RawRow { query: string; page: string; clicks: number; impressions: number; ctr: number; position: number }

async function fetchGSCData(startDate: string, endDate: string): Promise<RawRow[]> {
  const sc = google.searchconsole({ version: "v1", auth: getGoogleAuth() });
  const res = await sc.searchanalytics.query({
    siteUrl: GSC_SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query", "page"],
      rowLimit: 25000,
      dataState: "final",
    },
  });
  return (res.data.rows ?? []).map((r) => ({
    query: (r.keys?.[0] ?? "").toLowerCase(),
    page:  r.keys?.[1] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: (r.ctr ?? 0) * 100,
    position: r.position ?? 0,
  }));
}

// ── Keyword matching ──────────────────────────────────────────────────────────

/**
 * Given all raw rows, find rows where the GSC query matches the keyword.
 * We do a "contains" match (GSC query includes all words of the keyword),
 * then aggregate across pages to get the best representative row.
 */
function matchKeyword(keyword: string, rows: RawRow[]): {
  position: number | null; clicks: number; impressions: number; ctr: number; topPage: string | null
} {
  const kwLower = keyword.toLowerCase();
  const words = kwLower.split(" ");

  const matching = rows.filter((r) => words.every((w) => r.query.includes(w)));

  if (matching.length === 0) return { position: null, clicks: 0, impressions: 0, ctr: 0, topPage: null };

  // Aggregate: sum clicks/impressions, weighted avg position, find top page
  let totalClicks = 0, totalImpressions = 0, totalCtr = 0;
  const pageImpMap = new Map<string, number>();

  for (const r of matching) {
    totalClicks      += r.clicks;
    totalImpressions += r.impressions;
    totalCtr         += r.ctr * r.impressions; // weighted
    pageImpMap.set(r.page, (pageImpMap.get(r.page) ?? 0) + r.impressions);
  }

  // Weighted avg position by impressions
  const weightedPos = matching.reduce((sum, r) => sum + r.position * r.impressions, 0)
    / Math.max(matching.reduce((sum, r) => sum + r.impressions, 0), 1);

  const topPage = [...pageImpMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    position: Math.round(weightedPos * 10) / 10,
    clicks: totalClicks,
    impressions: totalImpressions,
    ctr: totalImpressions > 0 ? (totalCtr / totalImpressions) : 0,
    topPage,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const days: number = body.days ?? 28;
    const extraKeywords: string[] = Array.isArray(body.keywords) ? body.keywords : [];
    const allKeywords = [...new Set([...DEFAULT_KEYWORDS, ...extraKeywords.map((k: string) => k.toLowerCase())])];

    const cacheKey = `rank:${days}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) return NextResponse.json(cached.data);

    // Fetch current + previous period in parallel
    const [currentRows, prevRows] = await Promise.all([
      fetchGSCData(daysAgoDate(days), daysAgoDate(0)),
      fetchGSCData(daysAgoDate(days * 2), daysAgoDate(days)),
    ]);

    const rows: KeywordRankRow[] = allKeywords.map((keyword) => {
      const curr = matchKeyword(keyword, currentRows);
      const prev = matchKeyword(keyword, prevRows);

      const positionChange =
        curr.position !== null && prev.position !== null
          ? Math.round((prev.position - curr.position) * 10) / 10   // positive = improved
          : null;

      return {
        keyword,
        position:       curr.position,
        prevPosition:   prev.position,
        positionChange,
        clicks:         curr.clicks,
        impressions:    curr.impressions,
        ctr:            curr.ctr,
        topPage:        curr.topPage,
        isTracked:      DEFAULT_KEYWORDS.includes(keyword),
      };
    });

    // Sort: ranked first (by position asc), then unranked alphabetically
    rows.sort((a, b) => {
      if (a.position !== null && b.position !== null) return a.position - b.position;
      if (a.position !== null) return -1;
      if (b.position !== null) return 1;
      return a.keyword.localeCompare(b.keyword);
    });

    const result: RankTrackerResponse = {
      rows,
      asOf:   new Date().toISOString(),
      period: `${days}d`,
    };

    // Cache for 2 hours
    cache.set(cacheKey, { data: result, expiresAt: now + 2 * 60 * 60 * 1000 });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[rank-tracker]", message);
    return NextResponse.json({ rows: [], asOf: new Date().toISOString(), period: "28d", error: message }, { status: 500 });
  }
}
