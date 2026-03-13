// ─── Google Analytics Types ───────────────────────────────────────────────────

export interface GAMetricRow {
  dimensions: string[];
  metrics: string[];
}

export interface TrafficOverview {
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
  sessionsChange: number;
  usersChange: number;
  pageviewsChange: number;
}

export interface ChannelData {
  channel: string;
  sessions: number;
  users: number;
  conversions: number;
}

export interface TopPage {
  pagePath: string;
  pageTitle: string;
  sessions: number;
  pageviews: number;
  avgTime: number;
}

export interface DeviceData {
  device: string;
  sessions: number;
  percentage: number;
}

export interface GeoData {
  country: string;
  city: string;
  sessions: number;
}

export interface DailyTraffic {
  date: string;
  sessions: number;
  users: number;
}

export interface ProductCategoryPerformance {
  category: string;
  sessions: number;
  pageviews: number;
  avgTimeOnPage: number;
  url: string;
}

// ─── Google Search Console Types ──────────────────────────────────────────────

export interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCCountry {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCDevice {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCOverview {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  clicksChange: number;
  impressionsChange: number;
}

export interface DailyGSC {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// ─── SEO Opportunity Types ────────────────────────────────────────────────────

export interface SEOOpportunity {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  positionChange: number | null;
  opportunityType: "quick-win" | "ctr-improvement" | "position-boost";
  potentialClicks: number;
  recommendation: string;
}

// ─── Combined / Aggregated ─────────────────────────────────────────────────────

export interface DashboardSummary {
  ga: TrafficOverview;
  gsc: GSCOverview;
  topQueries: GSCQuery[];
  topPages: TopPage[];
  channelBreakdown: ChannelData[];
  deviceBreakdown: DeviceData[];
  dailyTraffic: DailyTraffic[];
  dailyGSC: DailyGSC[];
  opportunities: SEOOpportunity[];
  productPerformance: ProductCategoryPerformance[];
}

export type DateRange = "7d" | "28d" | "90d" | "180d";
