import type { SFRow, CrawlPage, CrawlSummary } from "@/types/crawl";

/** Convert a raw Screaming Frog CSV row to a normalised CrawlPage */
function rowToPage(row: SFRow): CrawlPage {
  const statusCode = parseInt(row["Status Code"] || "0", 10);
  const isSelfRef =
    (row["Canonical Link 1 (self referencing)"] || "").toLowerCase() === "true" ||
    (row["Canonical Link 1"] || "").toLowerCase() ===
      (row["Address"] || "").toLowerCase();

  return {
    url: row["Address"] || "",
    statusCode,
    status: row["Status"] || "",
    indexable: (row["Indexability"] || "").toLowerCase() === "indexable",
    title: row["Title 1"] || "",
    titleLength: parseInt(row["Title 1 Length"] || "0", 10),
    metaDesc: row["Meta Description 1"] || "",
    metaDescLength: parseInt(row["Meta Description 1 Length"] || "0", 10),
    h1: row["H1-1"] || "",
    canonical: row["Canonical Link 1"] || "",
    isSelfCanonical: isSelfRef,
    wordCount: parseInt(row["Word Count"] || "0", 10),
    crawlDepth: parseInt(row["Crawl Depth"] || row["Level"] || "0", 10),
    inlinks: parseInt(row["Inlinks"] || row["Unique Inlinks"] || "0", 10),
    redirectUrl: row["Redirect URL"] || "",
    responseTime: row["Response Time"] ? parseFloat(row["Response Time"]) * 1000 : undefined,
  };
}

/** Find groups of duplicate strings (case-insensitive, trimmed, non-empty) */
function findDuplicates<T>(
  pages: T[],
  key: (p: T) => string,
  minGroupSize = 2 // how many pages must share the value
): { value: string; pages: T[] }[] {
  const map = new Map<string, T[]>();
  for (const p of pages) {
    const v = key(p).trim().toLowerCase();
    if (!v) continue;
    if (!map.has(v)) map.set(v, []);
    map.get(v)!.push(p);
  }
  return [...map.entries()]
    .filter(([, ps]) => ps.length >= minGroupSize)
    .map(([value, ps]) => ({ value, pages: ps }))
    .sort((a, b) => b.pages.length - a.pages.length);
}

/**
 * Parse an array of raw SF rows (from PapaParse) into a CrawlSummary.
 * Only HTML pages are considered (Content-Type contains "text/html").
 */
export function parseSFRows(rows: SFRow[]): CrawlSummary {
  // Filter to HTML rows only (Skip CSS, JS, images etc.)
  const htmlRows = rows.filter(
    (r) =>
      r["Address"] &&
      (!r["Content Type"] || r["Content Type"].includes("html") || r["Content Type"] === "")
  );

  const pages = htmlRows.map(rowToPage);
  const indexablePages = pages.filter((p) => p.indexable);

  const errors = pages.filter((p) => p.statusCode >= 400);
  const redirects = pages.filter(
    (p) => p.statusCode >= 300 && p.statusCode < 400
  );

  // Title issues (only indexable pages)
  const missingTitle = indexablePages.filter((p) => !p.title.trim());
  const shortTitle = indexablePages.filter(
    (p) => p.title.trim() && p.titleLength > 0 && p.titleLength < 30
  );
  const longTitle = indexablePages.filter((p) => p.titleLength > 60);
  const dupTitleGroups = findDuplicates(indexablePages, (p) => p.title).map(
    (g) => ({ title: g.value, pages: g.pages })
  );

  // Meta description issues (only indexable pages)
  const missingMeta = indexablePages.filter((p) => !p.metaDesc.trim());
  const shortMeta = indexablePages.filter(
    (p) =>
      p.metaDesc.trim() && p.metaDescLength > 0 && p.metaDescLength < 70
  );
  const longMeta = indexablePages.filter((p) => p.metaDescLength > 155);
  const dupMetaGroups = findDuplicates(
    indexablePages,
    (p) => p.metaDesc
  ).map((g) => ({ meta: g.value, pages: g.pages }));

  // H1 issues (only indexable pages)
  const missingH1 = indexablePages.filter((p) => !p.h1.trim());
  const multipleH1: CrawlPage[] = []; // SF export shows H1-2 if there's a second one
  const rawRows = htmlRows.filter(
    (_, i) => pages[i]?.indexable && (rows[i]?.["H1-2"] || "").trim()
  );
  for (const r of rawRows) {
    const p = pages[htmlRows.indexOf(r)];
    if (p) multipleH1.push(p);
  }

  // Depth & orphan
  const deepPages = indexablePages.filter((p) => p.crawlDepth > 3);
  const orphanPages = indexablePages.filter(
    (p) => p.inlinks === 0 && p.statusCode === 200
  );

  // Non-canonical (canonical set, not self-referencing, indexable)
  const nonCanonical = indexablePages.filter(
    (p) => p.canonical && !p.isSelfCanonical
  );

  // Thin content: indexable 200s with word count set but < 300
  const thinContent = indexablePages.filter(
    (p) => p.statusCode === 200 && p.wordCount > 0 && p.wordCount < 300
  );

  // Slow pages: response time > 3s (SF exports in seconds, we converted to ms)
  const hasRT = pages.some((p) => p.responseTime !== undefined);
  const slowPages = hasRT
    ? indexablePages.filter((p) => p.responseTime !== undefined && p.responseTime > 3000)
    : [];

  // ─── Health Score (0–100) ───────────────────────────────────────────────────
  // Penalties scaled by % of affected indexable pages to be fair on large sites.
  const base = Math.max(indexablePages.length, 1);
  const pct = (n: number) => (n / base) * 100;

  const penalty = [
    Math.min(30, pct(errors.length) * 3),             // 4xx/5xx: critical
    Math.min(20, pct(missingTitle.length) * 2),       // missing title: critical
    Math.min(15, pct(missingH1.length) * 1.5),        // missing H1
    Math.min(10, pct(dupTitleGroups.length) * 2),     // duplicate title groups
    Math.min(10, pct(missingMeta.length) * 1),        // missing meta
    Math.min(5,  pct(thinContent.length) * 0.5),      // thin content
    Math.min(5,  pct(orphanPages.length) * 0.5),      // orphans
    Math.min(3,  pct(deepPages.length) * 0.3),        // deep pages
  ].reduce((a, b) => a + b, 0);

  const healthScore = Math.max(0, Math.round(100 - penalty));

  return {
    totalPages: pages.length,
    indexable: indexablePages.length,
    healthScore,
    errors,
    redirects,
    missingTitle,
    duplicateTitles: dupTitleGroups,
    shortTitle,
    longTitle,
    missingMeta,
    duplicateMeta: dupMetaGroups,
    shortMeta,
    longMeta,
    missingH1,
    multipleH1,
    deepPages,
    orphanPages,
    nonCanonical,
    thinContent,
    slowPages,
  };
}
