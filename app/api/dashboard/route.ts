import { NextRequest, NextResponse } from "next/server";
import { getTrafficOverview, getDailyTraffic, getChannelBreakdown, getTopPages, getDeviceBreakdown, getProductCategoryPerformance } from "@/lib/analytics";
import { getGSCOverview, getTopQueries, getDailyGSC, getSEOOpportunities } from "@/lib/search-console";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateRange = searchParams.get("range") ?? "28d";

  try {
    const [
      gaOverview,
      gscOverview,
      topQueries,
      topPages,
      channelBreakdown,
      deviceBreakdown,
      dailyTraffic,
      dailyGSC,
      opportunities,
      productPerformance,
    ] = await Promise.all([
      getTrafficOverview(dateRange),
      getGSCOverview(dateRange),
      getTopQueries(dateRange, 10),
      getTopPages(dateRange, 10),
      getChannelBreakdown(dateRange),
      getDeviceBreakdown(dateRange),
      getDailyTraffic(dateRange),
      getDailyGSC(dateRange),
      getSEOOpportunities(dateRange),
      getProductCategoryPerformance(dateRange),
    ]);

    return NextResponse.json({
      ga: gaOverview,
      gsc: gscOverview,
      topQueries,
      topPages,
      channelBreakdown,
      deviceBreakdown,
      dailyTraffic,
      dailyGSC,
      opportunities,
      productPerformance,
    }, { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=60" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Dashboard API]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
