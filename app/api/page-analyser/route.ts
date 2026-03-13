import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface KeywordAnalysis {
  keyword: string;
  inTitle: boolean;
  inH1: boolean;
  inMetaDesc: boolean;
  inH2: boolean;
  inH3: boolean;
  inUrl: boolean;
  inAltText: boolean;
  occurrences: number;
  densityPct: number;
  densityStatus: "low" | "good" | "high";
  firstParagraphHas: boolean;
}

export interface PageAnalysis {
  url: string;
  fetchedAt: string;
  keywordAnalysis?: KeywordAnalysis;
  // Meta
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescLength: number;
  canonical: string;
  robotsMeta: string;
  lang: string;
  viewport: string;
  // Headings
  h1s: string[];
  h2s: string[];
  h3s: string[];
  h4s: string[];
  headingCount: number;
  // Content
  wordCount: number;
  paragraphCount: number;
  bulletListCount: number;
  orderedListCount: number;
  tableCount: number;
  hasVideo: boolean;
  // Images
  imageCount: number;
  imagesWithAlt: number;
  // Links
  internalLinks: number;
  externalLinks: number;
  // Schema
  schemaTypes: string[];
  hasFaq: boolean;
  hasBreadcrumb: boolean;
  hasReview: boolean;
  // Social
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  // Tech detection
  techStack: TechItem[];
  // Scores
  scores: ScoreBreakdown;
  totalScore: number;
  error?: string;
}

export interface TechItem {
  name: string;
  category: "CMS" | "Framework" | "Analytics" | "Advertising" | "Live Chat" | "CDN" | "E-commerce" | "SEO Tool" | "CSS" | "Fonts" | "Consent" | "Other";
}

export interface ScoreBreakdown {
  meta: number;        // /25
  headings: number;    // /20
  content: number;     // /20
  schema: number;      // /20
  images: number;      // /10
  links: number;       // /5
  keyword: number;     // /20 (optional, only when keyword provided)
}

function calcScore(a: Omit<PageAnalysis, "scores" | "totalScore">): ScoreBreakdown {
  let meta = 0;
  if (a.title) { meta += 8; if (a.titleLength >= 40 && a.titleLength <= 60) meta += 4; else if (a.titleLength > 0 && a.titleLength < 70) meta += 2; }
  if (a.metaDescription) { meta += 8; if (a.metaDescLength >= 120 && a.metaDescLength <= 158) meta += 5; else if (a.metaDescLength > 0) meta += 2; }
  if (a.canonical) meta += 3;
  if (a.lang) meta += 2;
  if (a.ogTags["image"]) meta += 3;

  let headings = 0;
  if (a.h1s.length === 1) headings += 8; else if (a.h1s.length > 0) headings += 4;
  if (a.h2s.length >= 3) headings += 6; else if (a.h2s.length >= 1) headings += 3;
  if (a.h3s.length >= 2) headings += 4; else if (a.h3s.length >= 1) headings += 2;
  if (a.h4s.length >= 1) headings += 2;

  let content = 0;
  if (a.wordCount >= 1500) content += 8; else if (a.wordCount >= 800) content += 5; else if (a.wordCount >= 400) content += 3;
  if (a.paragraphCount >= 5) content += 4; else if (a.paragraphCount >= 2) content += 2;
  if (a.bulletListCount + a.orderedListCount >= 2) content += 3; else if (a.bulletListCount + a.orderedListCount >= 1) content += 1;
  if (a.tableCount >= 1) content += 2;
  if (a.hasVideo) content += 3;

  let schema = 0;
  if (a.schemaTypes.length >= 1) schema += 5;
  if (a.schemaTypes.length >= 3) schema += 3;
  if (a.hasFaq) schema += 5;
  if (a.hasReview) schema += 4;
  if (a.hasBreadcrumb) schema += 3;

  let images = 0;
  if (a.imageCount >= 3) images += 4; else if (a.imageCount >= 1) images += 2;
  if (a.imageCount > 0) {
    const pct = a.imagesWithAlt / a.imageCount;
    if (pct >= 1.0) images += 6; else if (pct >= 0.75) images += 4; else if (pct >= 0.5) images += 2;
  }

  let links = 0;
  if (a.internalLinks >= 5) links += 3; else if (a.internalLinks >= 1) links += 1;
  if (a.externalLinks >= 2) links += 2; else if (a.externalLinks >= 1) links += 1;

  return {
    meta: Math.min(25, meta),
    headings: Math.min(20, headings),
    content: Math.min(20, content),
    schema: Math.min(20, schema),
    images: Math.min(10, images),
    links: Math.min(5, links),
    keyword: 0, // populated separately when keyword is supplied
  };
}

function calcKeywordScore(ka: KeywordAnalysis): number {
  let score = 0;
  if (ka.inTitle)           score += 5;
  if (ka.inH1)              score += 5;
  if (ka.inMetaDesc)        score += 3;
  if (ka.inUrl)             score += 2;
  if (ka.inH2)              score += 2;
  if (ka.firstParagraphHas) score += 1;
  if (ka.inAltText)         score += 1;
  if (ka.densityStatus === "good") score += 3;
  else if (ka.densityStatus === "low" && ka.occurrences > 0) score += 1;
  return Math.min(20, score);
}

function buildKeywordAnalysis(kw: string, a: {
  title: string; h1s: string[]; h2s: string[]; h3s: string[];
  metaDescription: string; url: string;
  rawBodyText: string; altTexts: string[]; firstParaText: string;
}): KeywordAnalysis {
  const kwl = kw.toLowerCase().trim();
  const titlel = a.title.toLowerCase();
  const metaDescl = a.metaDescription.toLowerCase();
  const bodyl = a.rawBodyText.toLowerCase();
  const urll = a.url.toLowerCase();
  const firstParal = a.firstParaText.toLowerCase();

  // Count occurrences in body (whole word not required — partial match ok for phrases)
  const escapedKw = kwl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escapedKw, "gi");
  const occurrences = (a.rawBodyText.match(re) ?? []).length;
  const wordCount = a.rawBodyText.split(/\s+/).filter(Boolean).length;
  const densityPct = wordCount > 0 ? Math.round((occurrences / wordCount) * 1000) / 10 : 0;
  const densityStatus: KeywordAnalysis["densityStatus"] =
    densityPct === 0 ? "low" : densityPct < 0.5 ? "low" : densityPct <= 2.5 ? "good" : "high";

  return {
    keyword: kw,
    inTitle:           titlel.includes(kwl),
    inH1:              a.h1s.some(h => h.toLowerCase().includes(kwl)),
    inMetaDesc:        metaDescl.includes(kwl),
    inH2:              a.h2s.some(h => h.toLowerCase().includes(kwl)),
    inH3:              a.h3s.some(h => h.toLowerCase().includes(kwl)),
    inUrl:             urll.includes(kwl.replace(/\s+/g, "-")) || urll.includes(kwl.replace(/\s+/g, "_")) || urll.includes(kwl.replace(/\s+/g, "")),
    inAltText:         a.altTexts.some(t => t.toLowerCase().includes(kwl)),
    occurrences,
    densityPct,
    densityStatus,
    firstParagraphHas: firstParal.includes(kwl),
  };
}

export function detectTech(html: string): TechItem[] {
  const found: TechItem[] = [];
  const hl = html.toLowerCase();
  const seen = new Set<string>();

  function add(name: string, category: TechItem["category"]) {
    if (!seen.has(name)) { seen.add(name); found.push({ name, category }); }
  }
  function check(pattern: string | RegExp, name: string, category: TechItem["category"]) {
    const hit = typeof pattern === "string" ? hl.includes(pattern) : pattern.test(html);
    if (hit) add(name, category);
  }

  // ── CMS / Platform ────────────────────────────────────────────────────────
  check("wp-content/", "WordPress", "CMS");
  check("wp-includes/", "WordPress", "CMS");
  check("cdn.shopify.com", "Shopify", "CMS");
  check("shopify.com/s/files", "Shopify", "CMS");
  check("static.parastorage.com", "Wix", "CMS");
  check("wix.com", "Wix", "CMS");
  check("squarespace.com", "Squarespace", "CMS");
  check("data-wf-page", "Webflow", "CMS");
  check("/sites/default/files/", "Drupal", "CMS");
  check("drupal.org", "Drupal", "CMS");
  check(/content=["']joomla/i, "Joomla", "CMS");
  check("bigcommerce.com", "BigCommerce", "CMS");
  check(/content=["']ghost/i, "Ghost CMS", "CMS");
  check("ghost.io", "Ghost CMS", "CMS");
  check("hs-scripts.com", "HubSpot CMS", "CMS");
  check("js.hubspotforms.com", "HubSpot CMS", "CMS");
  check("craftcms.com", "Craft CMS", "CMS");
  check("prestashop", "PrestaShop", "CMS");
  check("typo3", "TYPO3", "CMS");
  check("/umbraco/", "Umbraco", "CMS");
  check("umbraco", "Umbraco", "CMS");
  check("silverstripe", "SilverStripe", "CMS");
  check(/pub\/static\/|magento\/|mage\//i, "Magento", "CMS");
  check("opencart", "OpenCart", "CMS");
  check("jimdo.com", "Jimdo", "CMS");
  check("weebly.com", "Weebly", "CMS");
  check("strikingly.com", "Strikingly", "CMS");
  check("myshoptet.com", "Shoptet", "CMS");
  check("nopcommerce", "nopCommerce", "CMS");
  check("concrete5", "Concrete CMS", "CMS");
  check("kentico", "Kentico", "CMS");
  check("sitefinity", "Sitefinity", "CMS");
  check("sitecore", "Sitecore", "CMS");
  check("/content/dam/", "Adobe Experience Manager", "CMS");

  // ── JS Frameworks ─────────────────────────────────────────────────────────
  check("_next/static", "Next.js", "Framework");
  check("__nuxt", "Nuxt.js", "Framework");
  check("astro-island", "Astro", "Framework");
  check(/gatsby-chunk|gatsby-browser/i, "Gatsby", "Framework");
  check(/ng-version|angular\.min|angular\.js/i, "Angular", "Framework");
  check(/vue\.global|vue\.esm|vue\.runtime|vue\.min/i, "Vue.js", "Framework");
  check("jquery.min.js", "jQuery", "Framework");
  check("jquery-", "jQuery", "Framework");
  check(/react\.production|react-dom|data-reactroot/i, "React", "Framework");
  check("__sveltekit", "SvelteKit", "Framework");
  check(/svelte\//i, "Svelte", "Framework");
  check(/remix\.run|\/__remix/i, "Remix", "Framework");
  check("htmx.org", "HTMX", "Framework");
  check("alpinejs", "Alpine.js", "Framework");
  check(/emberjs|ember\.min/i, "Ember.js", "Framework");
  check(/backbone\.js|backbone\.min/i, "Backbone.js", "Framework");
  check("stimulus", "Stimulus (Hotwire)", "Framework");
  check("turbo.es2017", "Turbo (Hotwire)", "Framework");
  check("mootools", "MooTools", "Framework");
  check("prototype.js", "Prototype.js", "Framework");

  // ── Analytics ─────────────────────────────────────────────────────────────
  check("google-analytics.com/analytics.js", "Google Analytics (UA)", "Analytics");
  check(/gtag\.js|gtag\(/i, "Google Analytics (GA4)", "Analytics");
  check("googletagmanager.com", "Google Tag Manager", "Analytics");
  check("static.hotjar.com", "Hotjar", "Analytics");
  check("plausible.io", "Plausible Analytics", "Analytics");
  check("clarity.ms", "Microsoft Clarity", "Analytics");
  check("matomo.js", "Matomo", "Analytics");
  check("cdn.segment.com", "Segment", "Analytics");
  check("cdn.amplitude.com", "Amplitude", "Analytics");
  check("api.mixpanel.com", "Mixpanel", "Analytics");
  check("cdn.heapanalytics.com", "Heap", "Analytics");
  check("fullstory.com", "FullStory", "Analytics");
  check("luckyorange.com", "Lucky Orange", "Analytics");
  check("mouseflow.com", "Mouseflow", "Analytics");
  check("smartlook.com", "Smartlook", "Analytics");
  check("cdn.usefathom.com", "Fathom Analytics", "Analytics");
  check("js.posthog.com", "PostHog", "Analytics");
  check("piwikpro.com", "Piwik PRO", "Analytics");
  check("woopra.com", "Woopra", "Analytics");
  check("inspectlet.com", "Inspectlet", "Analytics");
  check("statcounter.com", "StatCounter", "Analytics");

  // ── Advertising ───────────────────────────────────────────────────────────
  check("connect.facebook.net", "Facebook Pixel", "Advertising");
  check("googleadservices.com", "Google Ads", "Advertising");
  check("adsbygoogle", "Google AdSense", "Advertising");
  check("d.adroll.com", "AdRoll", "Advertising");
  check("bat.bing.com", "Microsoft Advertising", "Advertising");
  check("analytics.tiktok.com", "TikTok Pixel", "Advertising");
  check("snap.licdn.com", "LinkedIn Insight Tag", "Advertising");
  check("ct.pinterest.com", "Pinterest Tag", "Advertising");
  check("static.criteo.net", "Criteo", "Advertising");
  check("s.pinimg.com", "Pinterest Tag", "Advertising");
  check("taboola.com", "Taboola", "Advertising");
  check("outbrain.com", "Outbrain", "Advertising");
  check("twitter.com/i/adsct", "Twitter/X Ads", "Advertising");
  check("ads-twitter.com", "Twitter/X Ads", "Advertising");
  check("doubleclick.net", "Google Campaign Manager", "Advertising");
  check("app.impact.com", "Impact (Affiliate)", "Advertising");
  check("cdn.adsafeprotected.com", "IAS (Ad Safety)", "Advertising");

  // ── Live Chat ─────────────────────────────────────────────────────────────
  check("intercomcdn.com", "Intercom", "Live Chat");
  check("js.drift.com", "Drift", "Live Chat");
  check("tidio.com", "Tidio", "Live Chat");
  check("livechatinc.com", "LiveChat", "Live Chat");
  check("zopim.com", "Zendesk Chat", "Live Chat");
  check("tawk.to", "Tawk.to", "Live Chat");
  check("crisp.chat", "Crisp", "Live Chat");
  check("olark.com", "Olark", "Live Chat");
  check("snapengage.com", "SnapEngage", "Live Chat");
  check("freshchat.com", "Freshchat", "Live Chat");
  check("gorgias.com", "Gorgias", "Live Chat");
  check("widget.userlike.com", "Userlike", "Live Chat");
  check("chatra.io", "Chatra", "Live Chat");
  check("smartsupp.com", "Smartsupp", "Live Chat");
  check("front.com", "Front Chat", "Live Chat");

  // ── CDN ───────────────────────────────────────────────────────────────────
  check("cloudflareinsights.com", "Cloudflare", "CDN");
  check("cdn.jsdelivr.net", "jsDelivr", "CDN");
  check("unpkg.com", "unpkg", "CDN");
  check("cdnjs.cloudflare.com", "cdnjs", "CDN");
  check("/_vercel/", "Vercel", "CDN");
  check("netlify.app", "Netlify", "CDN");
  check("fastly.com", "Fastly", "CDN");
  check("akamaized.net", "Akamai", "CDN");
  check("wp.com/", "WordPress.com (Jetpack CDN)", "CDN");

  // ── E-commerce ────────────────────────────────────────────────────────────
  check("woocommerce", "WooCommerce", "E-commerce");
  check("js.stripe.com", "Stripe", "E-commerce");
  check("paypal.com/sdk", "PayPal", "E-commerce");
  check("klarna.com", "Klarna", "E-commerce");
  check("js.braintreegateway.com", "Braintree", "E-commerce");
  check("squareup.com", "Square", "E-commerce");
  check("app.ecwid.com", "Ecwid", "E-commerce");
  check("afterpay.com", "Afterpay", "E-commerce");
  check("clearpay.co.uk", "Clearpay", "E-commerce");

  // ── Email / CRM / Marketing ───────────────────────────────────────────────
  check("chimpstatic.com", "Mailchimp", "Other");
  check("list-manage.com", "Mailchimp", "Other");
  check("klaviyo.com", "Klaviyo", "Other");
  check("omnisend.com", "Omnisend", "Other");
  check("go.pardot.com", "Salesforce Pardot", "Other");
  check("mktdns.net", "Marketo", "Other");
  check("activecampaign.com", "ActiveCampaign", "Other");
  check("drip.com", "Drip", "Other");
  check("convertkit.com", "ConvertKit", "Other");
  check("mailerlite.com", "MailerLite", "Other");
  check("brevo.com", "Brevo (Sendinblue)", "Other");

  // ── SEO Tools ─────────────────────────────────────────────────────────────
  check("yoast.com", "Yoast SEO", "SEO Tool");
  check("rank-math", "Rank Math", "SEO Tool");
  check("all-in-one-seo", "All in One SEO", "SEO Tool");
  check("schema.org", "Schema.org markup", "SEO Tool");

  // ── CSS Frameworks ────────────────────────────────────────────────────────
  check("bootstrap.min.css", "Bootstrap", "CSS");
  check("bootstrap.css", "Bootstrap", "CSS");
  check(/cdn\.tailwindcss|tailwind\.min\.css/i, "Tailwind CSS", "CSS");
  check("bulma.css", "Bulma", "CSS");
  check("foundation.min.css", "Foundation", "CSS");
  check("semantic.min.css", "Semantic UI", "CSS");
  check("materialize.min.css", "Materialize", "CSS");
  check("animate.min.css", "Animate.css", "CSS");

  // ── Fonts ─────────────────────────────────────────────────────────────────
  check("fonts.googleapis.com", "Google Fonts", "Fonts");
  check("use.typekit.net", "Adobe Fonts", "Fonts");
  check("kit.fontawesome.com", "Font Awesome", "Fonts");
  check("use.fontawesome.com", "Font Awesome", "Fonts");
  check("fast.fonts.net", "Fonts.com", "Fonts");
  check("cloud.typography.com", "H&FJ Cloud Typography", "Fonts");

  // ── Cookie / Consent ──────────────────────────────────────────────────────
  check("cookiebot", "Cookiebot", "Consent");
  check("cdn.onetrust.com", "OneTrust", "Consent");
  check("consent.cookiefirst.com", "CookieFirst", "Consent");
  check("iubenda.com", "iubenda", "Consent");
  check("cookieyes.com", "CookieYes", "Consent");
  check("trustarc.com", "TrustArc", "Consent");
  check("usercentrics.eu", "Usercentrics", "Consent");
  check("cookielaw.org", "OneTrust", "Consent");
  check("termly.io", "Termly", "Consent");

  // ── Other ─────────────────────────────────────────────────────────────────
  check("maps.googleapis.com", "Google Maps", "Other");
  check("widget.trustpilot.com", "Trustpilot", "Other");
  check("reviews.io", "Reviews.io", "Other");
  check("feefo.com", "Feefo", "Other");
  check("judge.me", "Judge.me", "Other");
  check("stamped.io", "Stamped.io", "Other");
  check("yotpo.com", "Yotpo", "Other");
  check("recaptcha/api.js", "Google reCAPTCHA", "Other");
  check("hcaptcha.com", "hCaptcha", "Other");
  check("browser.sentry-cdn.com", "Sentry", "Other");
  check(/ingest\.sentry\.io/i, "Sentry", "Other");
  check("cdn.logrocket.io", "LogRocket", "Other");
  check("optimizely.com", "Optimizely", "Other");
  check("vwo.com", "VWO", "Other");
  check("abtasty.com", "AB Tasty", "Other");
  check("googleoptimize.com", "Google Optimize", "Other");
  check("calendly.com", "Calendly", "Other");
  check("hubspot.com/meetings", "HubSpot Meetings", "Other");
  check("app.apollo.io", "Apollo", "Other");
  check("wistia.com", "Wistia (Video)", "Other");
  check("vimeo.com", "Vimeo (Video)", "Other");
  check("youtube.com/embed", "YouTube (Embedded)", "Other");
  check("buzzsprout.com", "Buzzsprout (Podcast)", "Other");

  return found;
}

async function fetchAndAnalyse(url: string, keyword?: string): Promise<PageAnalysis> {
  const blankScores: ScoreBreakdown = { meta:0, headings:0, content:0, schema:0, images:0, links:0, keyword:0 };
  const blank: Omit<PageAnalysis, "scores" | "totalScore"> = {
    url, fetchedAt: new Date().toISOString(),
    title: "", titleLength: 0, metaDescription: "", metaDescLength: 0,
    canonical: "", robotsMeta: "", lang: "", viewport: "",
    h1s: [], h2s: [], h3s: [], h4s: [], headingCount: 0,
    wordCount: 0, paragraphCount: 0, bulletListCount: 0, orderedListCount: 0, tableCount: 0, hasVideo: false,
    imageCount: 0, imagesWithAlt: 0, internalLinks: 0, externalLinks: 0,
    schemaTypes: [], hasFaq: false, hasBreadcrumb: false, hasReview: false,
    ogTags: {}, twitterTags: {}, techStack: [],
  };

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ...blank, error: `HTTP ${res.status} ${res.statusText}`, scores: blankScores, totalScore: 0 };

    const html = await res.text();
    const $ = cheerio.load(html);
    const origin = new URL(url).origin;

    // ── Schema FIRST (before any removal) ─────────────────────────────────────
    const schemaTypes: string[] = [];
    let hasFaq = false, hasBreadcrumb = false, hasReview = false;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() ?? "") as unknown;
        const items: unknown[] = Array.isArray(json) ? json : [json];
        function walkItem(item: unknown) {
          if (typeof item !== "object" || item === null) return;
          const obj = item as Record<string, unknown>;
          if (obj["@type"]) {
            const t = String(obj["@type"]);
            schemaTypes.push(t);
            const tl = t.toLowerCase();
            if (tl.includes("faq")) hasFaq = true;
            if (t === "BreadcrumbList") hasBreadcrumb = true;
            if (["review","aggregaterating","product"].includes(tl)) hasReview = true;
          }
          if (Array.isArray(obj["@graph"])) (obj["@graph"] as unknown[]).forEach(walkItem);
        }
        items.forEach(walkItem);
      } catch { /* skip malformed */ }
    });

    // ── Meta tags FIRST ────────────────────────────────────────────────────────
    const ogTags: Record<string, string> = {};
    const twitterTags: Record<string, string> = {};
    let viewport = "", robotsMeta = "", metaDescription = "";
    $("meta").each((_, el) => {
      const prop = $(el).attr("property") ?? "";
      const name = ($(el).attr("name") ?? "").toLowerCase();
      const content = $(el).attr("content") ?? "";
      if (prop.startsWith("og:"))      ogTags[prop.slice(3)] = content;
      if (name.startsWith("twitter:")) twitterTags[name.slice(8)] = content;
      if (name === "description")      metaDescription = content.trim();
      if (name === "viewport")         viewport = content.trim();
      if (name === "robots")           robotsMeta = content.trim();
    });

    const titleText = $("title").first().text().trim();
    const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? "";
    const lang = $("html").attr("lang")?.trim() ?? "";

    // ── Check video before stripping ─────────────────────────────────────────
    const hasVideo = $("video, iframe[src*='youtube'], iframe[src*='vimeo'], iframe[src*='wistia'], iframe[src*='youtu.be']").length > 0;

    // ── Count links before stripping nav/footer ───────────────────────────────
    let internalLinks = 0, externalLinks = 0;
    const seenLinks = new Set<string>();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
      try {
        const abs = href.startsWith("http") ? href : new URL(href, url).href;
        if (seenLinks.has(abs)) return;
        seenLinks.add(abs);
        if (new URL(abs).origin === origin) internalLinks++; else externalLinks++;
      } catch { /* ignore */ }
    });

    // ── Now strip noise for content analysis ──────────────────────────────────
    $("script, style, noscript, svg").remove();

    // ── Headings ──────────────────────────────────────────────────────────────
    const h1s = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
    const h2s = $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 30);
    const h3s = $("h3").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 40);
    const h4s = $("h4").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20);

    // ── Content metrics ───────────────────────────────────────────────────────
    const paragraphCount = $("p").filter((_, el) => $(el).text().trim().length > 20).length;
    const bulletListCount = $("ul").length;
    const orderedListCount = $("ol").length;
    const tableCount = $("table").length;

    const rawText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;

    // ── Images ────────────────────────────────────────────────────────────────
    let imageCount = 0, imagesWithAlt = 0;
    const altTexts: string[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") ?? "";
      if (!src || (src.startsWith("data:") && src.length < 100)) return;
      imageCount++;
      const alt = ($(el).attr("alt") ?? "").trim();
      if (alt.length > 0) { imagesWithAlt++; altTexts.push(alt); }
    });

    // First meaningful paragraph for keyword check
    const firstParaText = $("p").filter((_, el) => $(el).text().trim().length > 40).first().text().trim();

    const partial: Omit<PageAnalysis, "scores" | "totalScore"> = {
      url, fetchedAt: new Date().toISOString(),
      title: titleText, titleLength: titleText.length,
      metaDescription, metaDescLength: metaDescription.length,
      canonical, robotsMeta, lang, viewport,
      h1s, h2s, h3s, h4s, headingCount: h1s.length + h2s.length + h3s.length + h4s.length,
      wordCount, paragraphCount, bulletListCount, orderedListCount, tableCount, hasVideo,
      imageCount, imagesWithAlt, internalLinks, externalLinks,
      schemaTypes: [...new Set(schemaTypes)], hasFaq, hasBreadcrumb, hasReview,
      ogTags, twitterTags, techStack: detectTech(html),
    };

    const breakdown = calcScore(partial);

    // ── Keyword analysis ──────────────────────────────────────────────────────
    let keywordAnalysis: KeywordAnalysis | undefined;
    if (keyword && keyword.trim()) {
      keywordAnalysis = buildKeywordAnalysis(keyword.trim(), {
        title: titleText, h1s, h2s, h3s, metaDescription,
        url, rawBodyText: rawText, altTexts, firstParaText,
      });
      breakdown.keyword = calcKeywordScore(keywordAnalysis);
    }

    const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { ...partial, keywordAnalysis, scores: breakdown, totalScore };
  } catch (err) {
    return { ...blank, error: err instanceof Error ? err.message : String(err), scores: blankScores, totalScore: 0 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { yourUrl, theirUrl, keyword } = (await req.json()) as { yourUrl: string; theirUrl: string; keyword?: string };
    if (!yourUrl || !theirUrl) return NextResponse.json({ error: "Both yourUrl and theirUrl are required" }, { status: 400 });
    const [yours, theirs] = await Promise.all([fetchAndAnalyse(yourUrl, keyword), fetchAndAnalyse(theirUrl, keyword)]);
    return NextResponse.json({ yours, theirs });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
