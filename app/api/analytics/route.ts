import { NextRequest, NextResponse } from "next/server";
import {
  getTrafficOverview,
  getChannelBreakdown,
  getTopPages,
  getDeviceBreakdown,
  getGeoData,
  getDailyTraffic,
  getProductCategoryPerformance,
} from "@/lib/analytics";

const CACHE_HEADERS = { "Cache-Control": "private, max-age=300, stale-while-revalidate=60" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "overview";
  const dateRange = searchParams.get("range") ?? "28d";
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  try {
    switch (type) {
      case "all": {
        const [overview, channels, pages, devices, geo, daily] = await Promise.all([
          getTrafficOverview(dateRange),
          getChannelBreakdown(dateRange),
          getTopPages(dateRange, limit),
          getDeviceBreakdown(dateRange),
          getGeoData(dateRange, limit),
          getDailyTraffic(dateRange),
        ]);
        return NextResponse.json({ overview, channels, pages, devices, geo, daily }, { headers: CACHE_HEADERS });
      }
      case "overview":
        return NextResponse.json(await getTrafficOverview(dateRange), { headers: CACHE_HEADERS });
      case "channels":
        return NextResponse.json(await getChannelBreakdown(dateRange), { headers: CACHE_HEADERS });
      case "pages":
        return NextResponse.json(await getTopPages(dateRange, limit), { headers: CACHE_HEADERS });
      case "devices":
        return NextResponse.json(await getDeviceBreakdown(dateRange), { headers: CACHE_HEADERS });
      case "geo":
        return NextResponse.json(await getGeoData(dateRange, limit), { headers: CACHE_HEADERS });
      case "daily":
        return NextResponse.json(await getDailyTraffic(dateRange), { headers: CACHE_HEADERS });
      case "products":
        return NextResponse.json(await getProductCategoryPerformance(dateRange), { headers: CACHE_HEADERS });
      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Analytics API]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
