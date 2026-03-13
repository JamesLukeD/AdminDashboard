import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const execFileAsync = promisify(execFile);
// Construct path without require.resolve so webpack never traces into lighthouse
const LH_BIN = path.join(process.cwd(), "node_modules", "lighthouse", "cli", "index.js");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CWVMetric {
  displayValue: string;
  numericValue: number;
  category: "FAST" | "AVERAGE" | "SLOW" | "unknown";
}

export interface PageSpeedStrategy {
  score: number;
  fcp: CWVMetric;
  lcp: CWVMetric;
  tbt: CWVMetric;
  cls: CWVMetric;
  si: CWVMetric;
  ttfb: CWVMetric;
  opportunities: { title: string; displayValue: string; savingsMs: number }[];
}

export interface FieldData {
  lcp: CWVMetric;
  fid: CWVMetric;
  cls: CWVMetric;
  fcp: CWVMetric;
  inp?: CWVMetric;
}

export interface PageSpeedResult {
  url: string;
  mobile: PageSpeedStrategy;
  desktop?: PageSpeedStrategy;   // optional — only fetched when strategy=both
  fieldData?: FieldData;
  cachedAt?: string;
  error?: string;
}

// ── In-memory cache (24 hour TTL) ──────────────────────────────────────────────

interface CacheEntry { result: PageSpeedResult; expiresAt: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(url: string) {
  try { return new URL(url).href; } catch { return url; }
}

function fromCache(url: string): PageSpeedResult | null {
  const entry = cache.get(cacheKey(url));
  if (!entry || Date.now() > entry.expiresAt) { cache.delete(cacheKey(url)); return null; }
  return { ...entry.result, cachedAt: new Date(entry.expiresAt - CACHE_TTL_MS).toISOString() };
}

function toCache(url: string, result: PageSpeedResult) {
  if (!result.error) cache.set(cacheKey(url), { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function blankMetric(): CWVMetric {
  return { displayValue: "N/A", numericValue: 0, category: "unknown" };
}

function blankStrategy(): PageSpeedStrategy {
  return {
    score: 0,
    fcp: blankMetric(), lcp: blankMetric(), tbt: blankMetric(),
    cls: blankMetric(), si: blankMetric(), ttfb: blankMetric(),
    opportunities: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMetric(audits: Record<string, any>, key: string): CWVMetric {
  const a = audits[key];
  if (!a) return blankMetric();
  return {
    displayValue: a.displayValue ?? "N/A",
    numericValue: typeof a.numericValue === "number" ? Math.round(a.numericValue) : 0,
    category: "unknown",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fieldMetric(data: any, key: string): CWVMetric {
  const m = data?.metrics?.[key];
  if (!m) return blankMetric();
  return {
    displayValue: m.percentile != null
      ? key.includes("CLS") ? (m.percentile / 100).toFixed(2) : `${(m.percentile / 1000).toFixed(1)}s`
      : "N/A",
    numericValue: m.percentile ?? 0,
    category: (m.category ?? "unknown") as CWVMetric["category"],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStrategy(lh: any): PageSpeedStrategy {
  const score = Math.round((lh?.categories?.performance?.score ?? 0) * 100);
  const audits = lh?.audits ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opps: PageSpeedStrategy["opportunities"] = Object.values(audits as Record<string, any>)
    .filter((a: any) => a.details?.type === "opportunity" && a.score !== null && a.score < 0.9)
    .map((a: any) => ({
      title: a.title ?? "",
      displayValue: a.displayValue ?? "",
      savingsMs: Math.round(a.details?.overallSavingsMs ?? a.numericValue ?? 0),
    }))
    .filter((o) => o.savingsMs > 100)
    .sort((a, b) => b.savingsMs - a.savingsMs)
    .slice(0, 5);

  return {
    score,
    fcp:  extractMetric(audits, "first-contentful-paint"),
    lcp:  extractMetric(audits, "largest-contentful-paint"),
    tbt:  extractMetric(audits, "total-blocking-time"),
    cls:  extractMetric(audits, "cumulative-layout-shift"),
    si:   extractMetric(audits, "speed-index"),
    ttfb: extractMetric(audits, "server-response-time"),
    opportunities: opps,
  };
}

async function runPageSpeed(url: string, strategy: "mobile" | "desktop"): Promise<{ lhr: unknown; fieldData: unknown }> {
  const formFactor = strategy === "mobile" ? "mobile" : "desktop";
  const outFile = path.join(os.tmpdir(), `lh-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  try {
    await execFileAsync(
      process.execPath,
      [
        LH_BIN,
        url,
        "--output=json",
        `--output-path=${outFile}`,
        `--form-factor=${formFactor}`,
        "--only-categories=performance",
        "--chrome-flags=--headless --no-sandbox --disable-gpu",
      ],
      { timeout: 90000 }
    );
    const raw = await fs.readFile(outFile, "utf-8");
    const lhr = JSON.parse(raw);
    return { lhr, fieldData: null };
  } finally {
    await fs.unlink(outFile).catch(() => {});
  }
}

async function analyseUrl(url: string, includeDesktop: boolean): Promise<PageSpeedResult> {
  const cached = fromCache(url);
  if (cached) return cached;

  try {
    // Always run mobile. Only run desktop when explicitly requested.
    const mob = await runPageSpeed(url, "mobile");
    const mobile = parseStrategy(mob.lhr);

    let desktop: PageSpeedStrategy | undefined;
    if (includeDesktop) {
      const desk = await runPageSpeed(url, "desktop");
      desktop = parseStrategy(desk.lhr);
    }

    // Field data from mobile call
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ld = mob.fieldData as any;
    let fieldData: FieldData | undefined;
    if (ld?.metrics) {
      fieldData = {
        fcp: fieldMetric(ld, "FIRST_CONTENTFUL_PAINT_MS"),
        lcp: fieldMetric(ld, "LARGEST_CONTENTFUL_PAINT_MS"),
        fid: fieldMetric(ld, "FIRST_INPUT_DELAY_MS"),
        cls: fieldMetric(ld, "CUMULATIVE_LAYOUT_SHIFT_SCORE"),
        inp: fieldMetric(ld, "INTERACTION_TO_NEXT_PAINT"),
      };
    }

    const result: PageSpeedResult = { url, mobile, desktop, fieldData };
    toCache(url, result);
    return result;
  } catch (err) {
    return {
      url,
      mobile: blankStrategy(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const strategy = req.nextUrl.searchParams.get("strategy") ?? "mobile";
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  const includeDesktop = strategy === "both" || strategy === "desktop";
  const result = await analyseUrl(url, includeDesktop);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const { yourUrl, theirUrl, includeDesktop = false } =
      (await req.json()) as { yourUrl: string; theirUrl: string; includeDesktop?: boolean };
    if (!yourUrl || !theirUrl) {
      return NextResponse.json({ error: "Both yourUrl and theirUrl are required" }, { status: 400 });
    }
    // Run both URLs in parallel (each does mobile-only by default = 2 API calls total)
    const [yours, theirs] = await Promise.all([
      analyseUrl(yourUrl, includeDesktop),
      analyseUrl(theirUrl, includeDesktop),
    ]);
    return NextResponse.json({ yours, theirs });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
