import { google } from "googleapis";
import { getGoogleAuth } from "./google-auth";
import { cached } from "./cache";
import type {
  TrafficOverview,
  ChannelData,
  TopPage,
  DeviceData,
  GeoData,
  DailyTraffic,
  ProductCategoryPerformance,
} from "@/types/analytics";

// Lazy singleton — avoids reconstructing the API wrapper on every request
let _analyticsClient: ReturnType<typeof google.analyticsdata> | null = null;
const analyticsDataClient = () => {
  if (!_analyticsClient) {
    _analyticsClient = google.analyticsdata({ version: "v1beta", auth: getGoogleAuth() });
  }
  return _analyticsClient;
};

const PROPERTY_ID = process.env.GA4_PROPERTY_ID!;

function toGA4Date(range: string): string {
  const days = parseInt(range.replace("d", ""), 10);
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

// ─── Overview Metrics ──────────────────────────────────────────────────────────

export function getTrafficOverview(dateRange: string = "28d"): Promise<TrafficOverview> {
  return cached(`ga:overview:${dateRange}`, async () => {
    const analytics = analyticsDataClient();
    const days = parseInt(dateRange.replace("d", ""), 10);
    const startDate = toGA4Date(dateRange);
    const prevStartDate = toGA4Date(`${days * 2}d`);
    const prevEndDate = toGA4Date(dateRange);

    const [current, previous] = await Promise.all([
      analytics.properties.runReport({
        property: `properties/${PROPERTY_ID}`,
        requestBody: {
          dateRanges: [{ startDate, endDate: "today" }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
            { name: "newUsers" },
          ],
        },
      }),
      analytics.properties.runReport({
        property: `properties/${PROPERTY_ID}`,
        requestBody: {
          dateRanges: [{ startDate: prevStartDate, endDate: prevEndDate }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
          ],
        },
      }),
    ]);

    const curr = current.data.rows?.[0]?.metricValues ?? [];
    const prev = previous.data.rows?.[0]?.metricValues ?? [];

    const sessions = parseFloat(curr[0]?.value ?? "0");
    const users = parseFloat(curr[1]?.value ?? "0");
    const pageviews = parseFloat(curr[2]?.value ?? "0");
    const prevSessions = parseFloat(prev[0]?.value ?? "0");
    const prevUsers = parseFloat(prev[1]?.value ?? "0");
    const prevPageviews = parseFloat(prev[2]?.value ?? "0");

    const pctChange = (c: number, p: number) =>
      p > 0 ? Math.round(((c - p) / p) * 100) : 0;

    return {
      sessions,
      users,
      pageviews,
      bounceRate: parseFloat(curr[3]?.value ?? "0"),
      avgSessionDuration: parseFloat(curr[4]?.value ?? "0"),
      newUsers: parseFloat(curr[5]?.value ?? "0"),
      sessionsChange: pctChange(sessions, prevSessions),
      usersChange: pctChange(users, prevUsers),
      pageviewsChange: pctChange(pageviews, prevPageviews),
    };
  });
}

// ─── Traffic by Channel ────────────────────────────────────────────────────────

export function getChannelBreakdown(dateRange: string = "28d"): Promise<ChannelData[]> {
  return cached(`ga:channels:${dateRange}`, async () => {
    const analytics = analyticsDataClient();
    const res = await analytics.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: toGA4Date(dateRange), endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "conversions" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      },
    });
    return (res.data.rows ?? []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? "Unknown",
      sessions: parseFloat(row.metricValues?.[0]?.value ?? "0"),
      users: parseFloat(row.metricValues?.[1]?.value ?? "0"),
      conversions: parseFloat(row.metricValues?.[2]?.value ?? "0"),
    }));
  });
}

// ─── Top Pages ─────────────────────────────────────────────────────────────────

export function getTopPages(dateRange: string = "28d", limit: number = 20): Promise<TopPage[]> {
  return cached(`ga:pages:${dateRange}:${limit}`, async () => {
    const analytics = analyticsDataClient();
    const res = await analytics.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: toGA4Date(dateRange), endDate: "today" }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: String(limit),
      },
    });
    return (res.data.rows ?? []).map((row) => ({
      pagePath: row.dimensionValues?.[0]?.value ?? "/",
      pageTitle: row.dimensionValues?.[1]?.value ?? "Unknown",
      sessions: parseFloat(row.metricValues?.[0]?.value ?? "0"),
      pageviews: parseFloat(row.metricValues?.[1]?.value ?? "0"),
      avgTime: parseFloat(row.metricValues?.[2]?.value ?? "0"),
    }));
  });
}

// ─── Device Breakdown ──────────────────────────────────────────────────────────

export function getDeviceBreakdown(dateRange: string = "28d"): Promise<DeviceData[]> {
  return cached(`ga:devices:${dateRange}`, async () => {
    const analytics = analyticsDataClient();
    const res = await analytics.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: toGA4Date(dateRange), endDate: "today" }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      },
    });
    const rows = res.data.rows ?? [];
    const total = rows.reduce(
      (sum, r) => sum + parseFloat(r.metricValues?.[0]?.value ?? "0"),
      0
    );
    return rows.map((row) => {
      const sessions = parseFloat(row.metricValues?.[0]?.value ?? "0");
      return {
        device: row.dimensionValues?.[0]?.value ?? "Unknown",
        sessions,
        percentage: total > 0 ? Math.round((sessions / total) * 100) : 0,
      };
    });
  });
}

// ─── Geographic Data ───────────────────────────────────────────────────────────

export function getGeoData(dateRange: string = "28d", limit: number = 15): Promise<GeoData[]> {
  return cached(`ga:geo:${dateRange}:${limit}`, async () => {
    const analytics = analyticsDataClient();
    const res = await analytics.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: toGA4Date(dateRange), endDate: "today" }],
        dimensions: [{ name: "country" }, { name: "city" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: String(limit),
      },
    });
    return (res.data.rows ?? []).map((row) => ({
      country: row.dimensionValues?.[0]?.value ?? "Unknown",
      city: row.dimensionValues?.[1]?.value ?? "Unknown",
      sessions: parseFloat(row.metricValues?.[0]?.value ?? "0"),
    }));
  });
}

// ─── Daily Traffic (Time Series) ───────────────────────────────────────────────

export function getDailyTraffic(dateRange: string = "28d"): Promise<DailyTraffic[]> {
  return cached(`ga:daily:${dateRange}`, async () => {
    const analytics = analyticsDataClient();
    const res = await analytics.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: toGA4Date(dateRange), endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      },
    });
    return (res.data.rows ?? []).map((row) => {
      const raw = row.dimensionValues?.[0]?.value ?? "20240101";
      const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      return {
        date,
        sessions: parseFloat(row.metricValues?.[0]?.value ?? "0"),
        users: parseFloat(row.metricValues?.[1]?.value ?? "0"),
      };
    });
  });
}

// ─── Product Category Performance ─────────────────────────────────────────────

const CAWARDEN_CATEGORIES: Record<string, string> = {
  "/c/bricks/": "Bricks",
  "/c/roof-tiles-fittings/": "Roof Tiles & Slates",
  "/c/timber-joinery/": "Timber & Doors",
  "/c/flooring/": "Flooring",
  "/c/hard-landscaping/": "Hard Landscaping",
  "/c/interior-exterior-products/": "Interior & Exterior",
};

export function getProductCategoryPerformance(dateRange: string = "28d"): Promise<ProductCategoryPerformance[]> {
  return cached(`ga:products:${dateRange}`, async () => {
    const analytics = analyticsDataClient();
    const res = await analytics.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: toGA4Date(dateRange), endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
        ],
        dimensionFilter: {
          orGroup: {
            expressions: Object.keys(CAWARDEN_CATEGORIES).map((path) => ({
              filter: {
                fieldName: "pagePath",
                stringFilter: { matchType: "BEGINS_WITH", value: path },
              },
            })),
          },
        },
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "100",
      },
    });

    const aggregated: Record<
      string,
      { sessions: number; pageviews: number; avgTimeSum: number; count: number; url: string }
    > = {};

    for (const row of res.data.rows ?? []) {
      const path = row.dimensionValues?.[0]?.value ?? "";
      const prefix = Object.keys(CAWARDEN_CATEGORIES).find((p) => path.startsWith(p));
      if (!prefix) continue;
      if (!aggregated[prefix]) {
        aggregated[prefix] = { sessions: 0, pageviews: 0, avgTimeSum: 0, count: 0, url: prefix };
      }
      aggregated[prefix].sessions += parseFloat(row.metricValues?.[0]?.value ?? "0");
      aggregated[prefix].pageviews += parseFloat(row.metricValues?.[1]?.value ?? "0");
      aggregated[prefix].avgTimeSum += parseFloat(row.metricValues?.[2]?.value ?? "0");
      aggregated[prefix].count += 1;
    }

    return Object.entries(aggregated)
      .map(([prefix, data]) => ({
        category: CAWARDEN_CATEGORIES[prefix],
        sessions: data.sessions,
        pageviews: data.pageviews,
        avgTimeOnPage: data.count > 0 ? data.avgTimeSum / data.count : 0,
        url: `https://cawardenreclaim.co.uk${prefix}`,
      }))
      .sort((a, b) => b.sessions - a.sessions);
  });
}
