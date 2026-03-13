"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { BarChart } from "@/components/charts/bar-chart";
import { ExternalLink, Package } from "lucide-react";
import { formatNumber, formatDuration } from "@/lib/utils";
import type { ProductCategoryPerformance, DateRange } from "@/types/analytics";

const categoryMeta: Record<string, { emoji: string; description: string }> = {
  Bricks: { emoji: "🧱", description: "Reclaimed, handmade, wirecut, blue & restoration bricks" },
  "Roof Tiles & Slates": { emoji: "🏠", description: "Reclaimed roof tiles, slates, fittings and specials" },
  "Timber & Doors": { emoji: "🪵", description: "Bespoke joinery, oak beams, ironmongery and stains" },
  Flooring: { emoji: "🏗️", description: "Porcelain tiles, reclaimed floorboards, quarry tiles" },
  "Hard Landscaping": { emoji: "🌿", description: "Paving, flagstone, cobbles, coping, walling stone" },
  "Interior & Exterior": { emoji: "🛋️", description: "Fireplaces, radiators, garden items, salvage" },
};

export default function ProductsPage() {
  const [range, setRange] = useState<DateRange>("28d");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductCategoryPerformance[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?type=products&range=${range}`);
      setProducts(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const chartData = products.map((p) => ({
    category: p.category,
    sessions: p.sessions,
    pageviews: p.pageviews,
  }));

  const totalSessions = products.reduce((s, p) => s + p.sessions, 0);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Product Performance"
        subtitle="Which product categories are driving the most interest"
        dateRange={range}
        onDateRangeChange={setRange}
        onRefresh={fetchData}
        loading={loading}
      />

      <div className="p-6 space-y-6">
        {/* Sessions by category chart */}
        <Card
          title="Sessions by Product Category"
          subtitle="GA4 sessions landing on each product section"
        >
          {loading ? (
            <div className="h-72 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div>
          ) : products.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-[#6e7681] gap-2">
              <Package className="w-8 h-8" />
              <p className="text-sm">No product category data available for this period.</p>
            </div>
          ) : (
            <BarChart
              data={chartData}
              xKey="category"
              yKey="sessions"
              color="#00ff88"
              height={300}
              formatY={(v) => formatNumber(v)}
            />
          )}
        </Card>

        {/* Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 bg-[#161b22] rounded-xl animate-pulse" />
              ))
            : products.map((p) => {
                const meta = categoryMeta[p.category] ?? { emoji: "📦", description: "" };
                const sharePercent =
                  totalSessions > 0 ? Math.round((p.sessions / totalSessions) * 100) : 0;

                return (
                  <div key={p.category} className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{meta.emoji}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-[#e6edf3]">{p.category}</h3>
                          <p className="text-xs text-[#6e7681]">{meta.description}</p>
                        </div>
                      </div>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#30363d] hover:text-brand-500 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#e6edf3]">{formatNumber(p.sessions)}</p>
                        <p className="text-xs text-[#6e7681]">Sessions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#e6edf3]">{formatNumber(p.pageviews)}</p>
                        <p className="text-xs text-[#6e7681]">Page Views</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#e6edf3]">{formatDuration(p.avgTimeOnPage)}</p>
                        <p className="text-xs text-[#6e7681]">Avg. Time</p>
                      </div>
                    </div>

                    {/* Share bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-[#6e7681] mb-1">
                        <span>Share of product traffic</span>
                        <span>{sharePercent}%</span>
                      </div>
                      <div className="h-1.5 bg-[#161b22] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${sharePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Insights block */}
        <Card title="📊 What This Tells You" subtitle="Interpreting product category performance">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-[#0a1420] rounded-lg">
              <p className="font-semibold text-blue-900">High Traffic = High Demand</p>
              <p className="text-[#79c0ff] mt-1 text-xs leading-relaxed">
                Categories with the most sessions are your top customer intent signals. Ensure these pages have strong calls-to-action, clear stock info, and fast load times.
              </p>
            </div>
            <div className="p-4 bg-[#0a1a12] rounded-lg">
              <p className="font-semibold text-green-900">Long Time = High Engagement</p>
              <p className="text-[#56d364] mt-1 text-xs leading-relaxed">
                Pages where visitors spend more time suggest strong product interest. Consider adding enquiry forms or "Request a Sample" CTAs to capture those leads.
              </p>
            </div>
            <div className="p-4 bg-[#1a0e00] rounded-lg">
              <p className="font-semibold text-orange-900">Low Traffic = SEO Gap</p>
              <p className="text-[#ffa657] mt-1 text-xs leading-relaxed">
                Categories with low sessions but valuable products may need better meta titles, more content, or dedicated landing pages targeting specific search queries.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
