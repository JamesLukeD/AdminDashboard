import { NextRequest, NextResponse } from "next/server";
import { detectTech } from "@/app/api/page-analyser/route";
import type { TechItem } from "@/app/api/page-analyser/route";

export interface TechStackResult {
  url: string;
  hostname: string;
  fetchedAt: string;
  techStack: TechItem[];
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        return NextResponse.json({ error: `HTTP ${res.status} ${res.statusText}` }, { status: 502 });
      }

      const html = await res.text();
      const techStack = detectTech(html);
      const hostname = new URL(url).hostname;

      return NextResponse.json({
        url,
        hostname,
        fetchedAt: new Date().toISOString(),
        techStack,
      } satisfies TechStackResult);
    } catch (fetchErr) {
      return NextResponse.json({ error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr) }, { status: 502 });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
