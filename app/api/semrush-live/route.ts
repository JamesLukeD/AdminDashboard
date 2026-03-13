import { NextRequest, NextResponse } from "next/server";
import { TRACKED_COMPETITORS } from "@/lib/tracked-competitors";
import fs from "fs";
import path from "path";

// ── Constants ─────────────────────────────────────────────────────────────────

const SEMRUSH_API  = "https://api.semrush.com/";
const DB           = "uk";
const KW_LIMIT     = 50; // rows per domain — each row costs 10 units

const CAWARDEN_DOMAIN = "cawardenreclaim.co.uk";

// Disk cache file — survives server restarts
const DISK_CACHE_PATH = path.join(process.cwd(), ".semrush-cache.json");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SemrushDomainOverview {
  domain: string;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  semrushRank: number;
}

export interface SemrushLiveKeyword {
  keyword: string;
  position: number;
  prevPosition: number | null;
  searchVolume: number;
  kd: number;
  cpc: number;
  url: string;
  traffic: number;
}

export interface SemrushLiveDomain {
  domain: string;
  label: string;          // friendly name
  overview: SemrushDomainOverview;
  keywords: SemrushLiveKeyword[];
  fetchedAt: string;
  unitsUsed: number;
}

export interface SemrushLiveResponse {
  domains: Record<string, SemrushLiveDomain>;
  cawardenDomain: string;
  totalUnitsUsed: number;
  cachedAt: string | null;
  error?: string;
}

// ── Disk-backed cache (survives server restarts) ──────────────────────────────

interface DiskCache { data: SemrushLiveResponse; expiresAt: number }

// In-memory layer — avoids hitting disk on every request
let memCache: DiskCache | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000;

function readDiskCache(): DiskCache | null {
  try {
    const raw = fs.readFileSync(DISK_CACHE_PATH, "utf8");
    const parsed: DiskCache = JSON.parse(raw);
    if (parsed.expiresAt > Date.now()) return parsed;
    // Expired — clean up
    fs.unlinkSync(DISK_CACHE_PATH);
    return null;
  } catch {
    return null;
  }
}

function writeDiskCache(entry: DiskCache) {
  try {
    fs.writeFileSync(DISK_CACHE_PATH, JSON.stringify(entry), "utf8");
  } catch {
    // Non-fatal — fall back to in-memory only
  }
}

function getCache(): DiskCache | null {
  if (memCache && memCache.expiresAt > Date.now()) return memCache;
  const disk = readDiskCache();
  if (disk) { memCache = disk; return disk; }
  return null;
}

function setCache(data: SemrushLiveResponse) {
  const entry: DiskCache = { data, expiresAt: Date.now() + CACHE_TTL };
  memCache = entry;
  writeDiskCache(entry);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNum(s: string | undefined): number {
  if (!s || s === "N/A" || s === "") return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}

/**
 * SEMrush API returns semicolon-delimited text with a header row.
 * Column headers match the short export_columns codes (Ph, Po, …).
 */
function parseSemrushText(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(";");
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}

// ── SEMrush fetchers ──────────────────────────────────────────────────────────

async function fetchDomainOverview(
  key: string,
  domain: string,
): Promise<SemrushDomainOverview> {
  const url =
    `${SEMRUSH_API}?type=domain_ranks&key=${encodeURIComponent(key)}` +
    `&export_columns=Dn,Rk,Or,Ot,Oc` +
    `&domain=${encodeURIComponent(domain)}&database=${DB}`;
  const res  = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const rows = parseSemrushText(text);
  if (!rows.length) {
    return { domain, organicKeywords: 0, organicTraffic: 0, organicCost: 0, semrushRank: 0 };
  }
  const r = rows[0];
  return {
    domain,
    organicKeywords: parseNum(r["Organic Keywords"]),
    organicTraffic:  parseNum(r["Organic Traffic"]),
    organicCost:     parseNum(r["Organic Cost"]),
    semrushRank:     parseNum(r["Rank"]),
  };
}

async function fetchDomainKeywords(
  key: string,
  domain: string,
): Promise<SemrushLiveKeyword[]> {
  const url =
    `${SEMRUSH_API}?type=domain_organic&key=${encodeURIComponent(key)}` +
    `&export_columns=Ph,Po,Pp,Nq,Kd,Cp,Ur,Tr` +
    `&domain=${encodeURIComponent(domain)}&database=${DB}` +
    `&display_limit=${KW_LIMIT}&display_sort=tr_desc`;
  const res  = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const rows = parseSemrushText(text);
  return rows
    .map((r) => ({
      keyword:      r["Keyword"] ?? "",
      position:     parseNum(r["Position"]),
      prevPosition: r["Previous Position"] && r["Previous Position"] !== "N/A" ? parseNum(r["Previous Position"]) : null,
      searchVolume: parseNum(r["Search Volume"]),
      kd:           parseNum(r["Keyword Difficulty"]),
      cpc:          parseNum(r["CPC"]),
      url:          r["Url"] ?? "",
      traffic:      parseNum(r["Traffic (%)"]),
    }))
    .filter((k) => k.keyword.length > 0 && k.position > 0);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bust = searchParams.get("bust") === "1";

  // Serve from cache unless caller requests a fresh pull
  if (!bust) {
    const cached = getCache();
    if (cached) return NextResponse.json(cached.data);
  }

  const apiKey = process.env.SEMRUSH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      domains: {},
      cawardenDomain: CAWARDEN_DOMAIN,
      totalUnitsUsed: 0,
      cachedAt: null,
      error: "SEMRUSH_API_KEY not configured in .env.local",
    } satisfies SemrushLiveResponse);
  }

  // Build list: Cawarden first, then tracked competitors
  const domainsToFetch: { domain: string; label: string }[] = [
    { domain: CAWARDEN_DOMAIN, label: "Cawarden" },
    ...TRACKED_COMPETITORS.map((c) => ({ domain: c.domainPattern, label: c.name })),
  ];

  // Unit budget: (10 overview + 50 rows × 10) × 6 domains ≈ 3,060 units per refresh
  const results = await Promise.allSettled(
    domainsToFetch.map(async ({ domain, label }) => {
      const [overview, keywords] = await Promise.all([
        fetchDomainOverview(apiKey, domain),
        fetchDomainKeywords(apiKey, domain),
      ]);
      const unitsUsed = 10 + keywords.length * 10;
      const entry: SemrushLiveDomain = {
        domain,
        label,
        overview,
        keywords,
        fetchedAt: new Date().toISOString(),
        unitsUsed,
      };
      return entry;
    }),
  );

  let totalUnitsUsed = 0;
  const domains: Record<string, SemrushLiveDomain> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      domains[result.value.domain] = result.value;
      totalUnitsUsed += result.value.unitsUsed;
    }
  }

  const data: SemrushLiveResponse = {
    domains,
    cawardenDomain: CAWARDEN_DOMAIN,
    totalUnitsUsed,
    cachedAt: new Date().toISOString(),
  };

  setCache(data);
  return NextResponse.json(data);
}
