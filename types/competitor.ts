// ─── Raw SEMrush CSV row types ───────────────────────────────────────────────

export interface SemrushKeywordRow {
  Keyword: string;
  Position: string;
  "Previous Position": string;
  "Search Volume": string;
  "Keyword Difficulty": string;
  "CPC (USD)": string;
  URL: string;
  "Traffic (%)": string;
  Traffic: string;
  Trends?: string;
}

export interface SemrushBacklinkRow {
  "Page Score"?: string;
  "Source URL": string;
  "Source title"?: string;
  "Target URL": string;
  Anchor: string;
  Type?: string;
  Nofollow?: string;
  "Image Link"?: string;
  "First seen"?: string;
  "Last seen"?: string;
}

export interface SemrushTopPageRow {
  URL: string;
  "Traffic %"?: string;
  Traffic?: string;
  Keywords?: string;
  Backlinks?: string;
  "Top Keyword"?: string;
  "Top Keyword Position"?: string;
  "Top Keyword Volume"?: string;
}

// ─── Normalised types ─────────────────────────────────────────────────────────

export interface SemrushKeyword {
  keyword: string;
  position: number;
  prevPosition: number | null;
  searchVolume: number;
  kd: number;
  cpc: number;
  url: string;
  trafficPct: number;
  traffic: number;
}

export interface SemrushBacklink {
  pageScore: number;
  sourceUrl: string;
  sourceTitle: string;
  targetUrl: string;
  anchor: string;
  type: string;
  nofollow: boolean;
  firstSeen: string;
  lastSeen: string;
}

export interface SemrushTopPage {
  url: string;
  trafficPct: number;
  traffic: number;
  keywords: number;
  backlinks: number;
  topKeyword: string;
  topKeywordPosition: number;
  topKeywordVolume: number;
}

export interface DomainProfile {
  domain: string;
  keywords: SemrushKeyword[];
  backlinks: SemrushBacklink[];
  topPages: SemrushTopPage[];
  totalTraffic: number;
  totalKeywords: number;
  avgPosition: number;
  top3Count: number;
  top10Count: number;
  top3Traffic: number;
}

export type SemrushExportType = "keywords" | "backlinks" | "pages" | "unknown";

export interface CompetitorGap {
  keyword: string;
  searchVolume: number;
  kd: number;
  yourPosition: number | null;
  yourUrl: string;
  theirPosition: number | null;
  theirUrl: string;
  opportunity: "gap" | "behind" | "ahead" | "tied";
}
