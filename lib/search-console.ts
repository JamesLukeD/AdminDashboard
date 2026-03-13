import { google } from "googleapis";
import { getGoogleAuth } from "./google-auth";
import { cached } from "./cache";
import type {
  GSCQuery,
  GSCPage,
  GSCCountry,
  GSCDevice,
  GSCOverview,
  DailyGSC,
  SEOOpportunity,
} from "@/types/analytics";

const GSC_SITE_URL = process.env.GSC_SITE_URL ?? "https://cawardenreclaim.co.uk/";

// Lazy singleton client
let _scClient: ReturnType<typeof google.searchconsole> | null = null;
function getSearchConsoleClient() {
  if (!_scClient) {
    _scClient = google.searchconsole({ version: "v1", auth: getGoogleAuth() });
  }
  return _scClient;
}

function toGSCDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function daysFromRange(range: string): number {
  return parseInt(range.replace("d", ""), 10);
}

// ─── Overview ──────────────────────────────────────────────────────────────────

export function getGSCOverview(dateRange: string = "28d"): Promise<GSCOverview> {
  return cached(`gsc:overview:${dateRange}`, async () => {
    const sc = getSearchConsoleClient();
    const days = daysFromRange(dateRange);
    const [current, previous] = await Promise.all([
      sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: { startDate: toGSCDate(days), endDate: toGSCDate(0), dimensions: [] },
      }),
      sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: { startDate: toGSCDate(days * 2), endDate: toGSCDate(days), dimensions: [] },
      }),
    ]);
    const curr = current.data.rows?.[0] ?? {};
    const prev = previous.data.rows?.[0] ?? {};
    const pctChange = (c: number, p: number) =>
      p > 0 ? Math.round(((c - p) / p) * 100) : 0;
    return {
      totalClicks: curr.clicks ?? 0,
      totalImpressions: curr.impressions ?? 0,
      avgCtr: (curr.ctr ?? 0) * 100,
      avgPosition: curr.position ?? 0,
      clicksChange: pctChange(curr.clicks ?? 0, prev.clicks ?? 0),
      impressionsChange: pctChange(curr.impressions ?? 0, prev.impressions ?? 0),
    };
  });
}

// ─── Top Queries ───────────────────────────────────────────────────────────────

export function getTopQueries(dateRange: string = "28d", limit: number = 25): Promise<GSCQuery[]> {
  return cached(`gsc:queries:${dateRange}:${limit}`, async () => {
    const sc = getSearchConsoleClient();
    const days = daysFromRange(dateRange);
    const res = await sc.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: {
        startDate: toGSCDate(days),
        endDate: toGSCDate(0),
        dimensions: ["query"],
        rowLimit: limit,
      },
    });
    return (res.data.rows ?? []).map((row) => ({
      query: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: (row.ctr ?? 0) * 100,
      position: row.position ?? 0,
    }));
  });
}

// ─── Top Pages ─────────────────────────────────────────────────────────────────

export function getTopGSCPages(dateRange: string = "28d", limit: number = 25): Promise<GSCPage[]> {
  return cached(`gsc:pages:${dateRange}:${limit}`, async () => {
    const sc = getSearchConsoleClient();
    const days = daysFromRange(dateRange);
    const res = await sc.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: {
        startDate: toGSCDate(days),
        endDate: toGSCDate(0),
        dimensions: ["page"],
        rowLimit: limit,
      },
    });
    return (res.data.rows ?? []).map((row) => ({
      page: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: (row.ctr ?? 0) * 100,
      position: row.position ?? 0,
    }));
  });
}

// ─── By Country ────────────────────────────────────────────────────────────────

export function getGSCByCountry(dateRange: string = "28d", limit: number = 15): Promise<GSCCountry[]> {
  return cached(`gsc:countries:${dateRange}:${limit}`, async () => {
    const sc = getSearchConsoleClient();
    const days = daysFromRange(dateRange);
    const res = await sc.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: {
        startDate: toGSCDate(days),
        endDate: toGSCDate(0),
        dimensions: ["country"],
        rowLimit: limit,
      },
    });
    return (res.data.rows ?? []).map((row) => ({
      country: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: (row.ctr ?? 0) * 100,
      position: row.position ?? 0,
    }));
  });
}

// ─── By Device ─────────────────────────────────────────────────────────────────

export function getGSCByDevice(dateRange: string = "28d"): Promise<GSCDevice[]> {
  return cached(`gsc:devices:${dateRange}`, async () => {
    const sc = getSearchConsoleClient();
    const days = daysFromRange(dateRange);
    const res = await sc.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: {
        startDate: toGSCDate(days),
        endDate: toGSCDate(0),
        dimensions: ["device"],
        rowLimit: 10,
      },
    });
    return (res.data.rows ?? []).map((row) => ({
      device: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: (row.ctr ?? 0) * 100,
      position: row.position ?? 0,
    }));
  });
}

// ─── Daily GSC Data (Time Series) ─────────────────────────────────────────────

export function getDailyGSC(dateRange: string = "28d"): Promise<DailyGSC[]> {
  return cached(`gsc:daily:${dateRange}`, async () => {
    const sc = getSearchConsoleClient();
    const days = daysFromRange(dateRange);
    const res = await sc.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: {
        startDate: toGSCDate(days),
        endDate: toGSCDate(0),
        dimensions: ["date"],
        rowLimit: 500,
      },
    });
    return (res.data.rows ?? []).map((row) => ({
      date: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: (row.ctr ?? 0) * 100,
      position: row.position ?? 0,
    }));
  });
}

// ─── SEO Opportunities ─────────────────────────────────────────────────────────

export function getSEOOpportunities(dateRange: string = "28d"): Promise<SEOOpportunity[]> {
  return cached(`gsc:opportunities:${dateRange}`, async () => {
    const sc = getSearchConsoleClient();
    const days = daysFromRange(dateRange);

    // Fetch current + previous period in parallel to compute position delta
    const [current, previous] = await Promise.all([
      sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
          startDate: toGSCDate(days),
          endDate: toGSCDate(0),
          dimensions: ["query", "page"],
          rowLimit: 25000,
        },
      }),
      sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
          startDate: toGSCDate(days * 2),
          endDate: toGSCDate(days),
          dimensions: ["query", "page"],
          rowLimit: 25000,
        },
      }),
    ]);

    // Build a lookup of previous positions by "query|page"
    const prevPositions = new Map<string, number>();
    for (const row of previous.data.rows ?? []) {
      const key = `${row.keys?.[0]}|${row.keys?.[1]}`;
      prevPositions.set(key, row.position ?? 0);
    }

    const opportunities: SEOOpportunity[] = [];
    for (const row of current.data.rows ?? []) {
      const query = row.keys?.[0] ?? "";
      const page = row.keys?.[1] ?? "";
      const clicks = row.clicks ?? 0;
      const impressions = row.impressions ?? 0;
      const ctr = (row.ctr ?? 0) * 100;
      const position = row.position ?? 0;

      const prevPos = prevPositions.get(`${query}|${page}`) ?? null;
      // positionChange: negative = improved (moved up), positive = dropped
      const positionChange = prevPos !== null ? Math.round((prevPos - position) * 10) / 10 : null;

      if (position >= 5 && position <= 15 && impressions >= 20) {
        const potentialClicks = Math.round(impressions * 0.08);
        opportunities.push({
          query, page, clicks, impressions, ctr, position, positionChange,
          opportunityType: "quick-win",
          potentialClicks,
          recommendation: `Ranking ${position.toFixed(1)} — optimise the page's title tag and H1 to boost to top 5. Potential +${potentialClicks} clicks/period.`,
        });
      } else if (impressions >= 50 && ctr < 2 && position <= 20) {
        const potentialClicks = Math.round(impressions * 0.04);
        opportunities.push({
          query, page, clicks, impressions, ctr, position, positionChange,
          opportunityType: "ctr-improvement",
          potentialClicks,
          recommendation: `${impressions} impressions but only ${ctr.toFixed(1)}% CTR. Rewrite meta title/description for "${query}" to be more compelling. Potential +${potentialClicks} clicks.`,
        });
      }
    }
    return opportunities
      .sort((a, b) => b.potentialClicks - a.potentialClicks)
      .slice(0, 100);
  });
}
