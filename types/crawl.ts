// Screaming Frog CSV row (Internal HTML export)
export interface SFRow {
  Address: string;
  "Content Type": string;
  "Status Code": string;
  Status: string;
  Indexability: string;
  "Indexability Status": string;
  "Title 1": string;
  "Title 1 Length": string;
  "Title 1 Pixel Width": string;
  "Meta Description 1": string;
  "Meta Description 1 Length": string;
  "Meta Description 1 Pixel Width": string;
  "H1-1": string;
  "H1-1 Length": string;
  "H1-2": string;
  "H2-1": string;
  "H2-2": string;
  "Meta Robots 1": string;
  "Canonical Link 1": string;
  "Canonical Link 1 (self referencing)": string;
  "Size (bytes)": string;
  "Word Count": string;
  "Crawl Depth": string;
  "Inlinks": string;
  "Unique Inlinks": string;
  "Outlinks": string;
  "Redirect URL": string;
  [key: string]: string; // allow unknown cols
}

export interface CrawlPage {
  url: string;
  statusCode: number;
  status: string;
  indexable: boolean;
  title: string;
  titleLength: number;
  metaDesc: string;
  metaDescLength: number;
  h1: string;
  canonical: string;
  isSelfCanonical: boolean;
  wordCount: number;
  crawlDepth: number;
  inlinks: number;
  redirectUrl: string;
  responseTime?: number; // ms, if SF export includes it
}

export interface CrawlIssue {
  url: string;
  issueType: string;
  detail: string;
  severity: "error" | "warning" | "info";
}

export interface CrawlSummary {
  totalPages: number;
  indexable: number;
  healthScore: number;          // 0-100
  errors: CrawlPage[];          // 4xx / 5xx
  redirects: CrawlPage[];       // 3xx
  missingTitle: CrawlPage[];
  duplicateTitles: { title: string; pages: CrawlPage[] }[];
  shortTitle: CrawlPage[];      // < 30 chars
  longTitle: CrawlPage[];       // > 60 chars
  missingMeta: CrawlPage[];
  duplicateMeta: { meta: string; pages: CrawlPage[] }[];
  shortMeta: CrawlPage[];       // < 70 chars
  longMeta: CrawlPage[];        // > 155 chars
  missingH1: CrawlPage[];
  multipleH1: CrawlPage[];
  deepPages: CrawlPage[];       // depth > 3
  orphanPages: CrawlPage[];     // inlinks === 0 && indexable
  nonCanonical: CrawlPage[];    // canonical differs from URL
  thinContent: CrawlPage[];     // indexable, < 300 words
  slowPages: CrawlPage[];       // response time > 3000 ms
}
