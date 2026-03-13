import { NextRequest, NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SerpResult {
  position: number;
  url: string;
  domain: string;
  displayLink: string;
  title: string;
  snippet: string;
  isCawarden: boolean;
}

export interface SerpScoutResponse {
  query: string;
  totalResults: string;
  results: SerpResult[];
  cawardenPosition: number | null;
  error?: string;
}

// ── In-memory cache (6 hour TTL — SERP rankings don't change minute-to-minute) ─

interface CacheEntry { data: SerpScoutResponse; expiresAt: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 6 * 60 * 60 * 1000;

const CAWARDEN_DOMAIN = "cawardenreclaim.co.uk";

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { query } = (await req.json()) as { query: string };
    if (!query?.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const q = query.trim();

    // Serve from cache
    const cached = cache.get(q);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data);
    }

    const apiKey = process.env.GOOGLE_CSE_API_KEY;
    const cx     = process.env.GOOGLE_CSE_ID;

    if (!apiKey || !cx) {
      return NextResponse.json({
        query: q,
        totalResults: "0",
        results: [],
        cawardenPosition: null,
        error: "GOOGLE_CSE_API_KEY or GOOGLE_CSE_ID not configured in .env.local",
      } satisfies SerpScoutResponse);
    }

    // UK-focused search: gl=gb country restrict, hl=en
    const qs = new URLSearchParams({
      key: apiKey,
      cx,
      q: `${q} UK`,
      num: "10",
      gl: "gb",
      hl: "en",
      cr: "countryGB",
    });

    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?${qs}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`CSE API ${res.status}: ${txt.slice(0, 300)}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await res.json() as any;
    const items = (json.items ?? []) as Record<string, string>[];

    const results: SerpResult[] = items.map((item, i) => {
      const url = item.link ?? "";
      let domain = "";
      try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { domain = url; }
      return {
        position: i + 1,
        url,
        domain,
        displayLink: item.displayLink ?? domain,
        title: item.title ?? "",
        snippet: item.snippet ?? "",
        isCawarden: domain.includes(CAWARDEN_DOMAIN),
      };
    });

    const cawardenResult = results.find((r) => r.isCawarden);
    const cawardenPosition = cawardenResult?.position ?? null;

    const data: SerpScoutResponse = {
      query: q,
      totalResults: json.searchInformation?.totalResults ?? "—",
      results,
      cawardenPosition,
    };

    cache.set(q, { data, expiresAt: Date.now() + CACHE_TTL });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
