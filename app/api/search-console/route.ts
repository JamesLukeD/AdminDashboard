import { NextRequest, NextResponse } from "next/server";
import {
  getGSCOverview,
  getTopQueries,
  getTopGSCPages,
  getGSCByCountry,
  getGSCByDevice,
  getDailyGSC,
  getSEOOpportunities,
} from "@/lib/search-console";

const CACHE_HEADERS = { "Cache-Control": "private, max-age=300, stale-while-revalidate=60" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "overview";
  const dateRange = searchParams.get("range") ?? "28d";
  const limit = parseInt(searchParams.get("limit") ?? "25", 10);

  try {
    switch (type) {
      case "all": {
        const [overview, queries, pages, devices, daily] = await Promise.all([
          getGSCOverview(dateRange),
          getTopQueries(dateRange, limit),
          getTopGSCPages(dateRange, limit),
          getGSCByDevice(dateRange),
          getDailyGSC(dateRange),
        ]);
        return NextResponse.json({ overview, queries, pages, devices, daily }, { headers: CACHE_HEADERS });
      }
      case "overview":
        return NextResponse.json(await getGSCOverview(dateRange), { headers: CACHE_HEADERS });
      case "queries":
        return NextResponse.json(await getTopQueries(dateRange, limit), { headers: CACHE_HEADERS });
      case "pages":
        return NextResponse.json(await getTopGSCPages(dateRange, limit), { headers: CACHE_HEADERS });
      case "countries":
        return NextResponse.json(await getGSCByCountry(dateRange, limit), { headers: CACHE_HEADERS });
      case "devices":
        return NextResponse.json(await getGSCByDevice(dateRange), { headers: CACHE_HEADERS });
      case "daily":
        return NextResponse.json(await getDailyGSC(dateRange), { headers: CACHE_HEADERS });
      case "opportunities":
        return NextResponse.json(await getSEOOpportunities(dateRange), { headers: CACHE_HEADERS });
      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Search Console API]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
