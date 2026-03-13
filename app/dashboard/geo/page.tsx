"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from "recharts";
import { MapPin, Globe, TrendingUp, Users } from "lucide-react";
import { formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import type { GeoData, GSCCountry, DateRange } from "@/types/analytics";

const BRAND = "#00ff88";
const COUNTRY_COLORS = [BRAND, "#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#64748b"];

function StatBlock({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl shadow-sm p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "15" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[#6e7681] font-medium">{label}</p>
        <p className="text-2xl font-bold text-[#e6edf3] mt-0.5">{value}</p>
        <p className="text-xs text-[#6e7681] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function CountryBar({ rank, country, clicks, impressions, ctr, position, max, color }: {
  rank: number; country: string; clicks: number; impressions: number; ctr: number; position: number; max: number; color: string;
}) {
  const pct = max > 0 ? (clicks / max) * 100 : 0;
  return (
    <div className="py-3 border-b border-[#1e2d3d] last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-bold text-[#30363d] w-5 shrink-0 text-right">{rank}</span>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-[#c9d1d9] uppercase">{country}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs tabular-nums">
          <span className="text-[#8b949e] font-semibold w-14 text-right">{formatNumber(clicks)} <span className="text-[#6e7681] font-normal">clicks</span></span>
          <span className="text-[#6e7681] w-18 text-right">{formatNumber(impressions)} impr.</span>
          <span className="text-[#484f58] w-12 text-right">{formatPercent(ctr)}</span>
          <span className="font-medium text-[#8b949e] w-12 text-right">#{formatPosition(position)}</span>
        </div>
      </div>
      <div className="ml-7 h-2 bg-[#161b22] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function CityRow({ rank, city, country, sessions, max }: { rank: number; city: string; country: string; sessions: number; max: number }) {
  const pct = max > 0 ? (sessions / max) * 100 : 0;
  return (
    <div className="py-2.5 border-b border-[#1e2d3d] last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-bold text-[#30363d] w-5 shrink-0 text-right">{rank}</span>
        <MapPin className="w-3.5 h-3.5 text-[#30363d] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#c9d1d9] font-medium">{city || "Unknown"}</p>
          <p className="text-xs text-[#6e7681]">{country}</p>
        </div>
        <span className="text-sm font-semibold text-[#8b949e] tabular-nums shrink-0">{formatNumber(sessions)}</span>
      </div>
      <div className="ml-7 h-1.5 bg-[#161b22] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "#6366f1" }} />
      </div>
    </div>
  );
}

export default function GeoPage() {
  const [range, setRange] = useState<DateRange>("28d");
  const [loading, setLoading] = useState(true);
  const [gaGeo, setGAGeo] = useState<GeoData[]>([]);
  const [gscCountries, setGSCCountries] = useState<GSCCountry[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ga, gsc] = await Promise.all([
        fetch(`/api/analytics?type=geo&range=${range}&limit=20`).then((r) => r.json()),
        fetch(`/api/search-console?type=countries&range=${range}&limit=20`).then((r) => r.json()),
      ]);
      setGAGeo(ga);
      setGSCCountries(gsc);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const ukSessions = gaGeo.filter((g) => g.country === "United Kingdom").reduce((s, g) => s + g.sessions, 0);
  const totalSessions = gaGeo.reduce((s, g) => s + g.sessions, 0);
  const uniqueCountries = new Set(gaGeo.map((g) => g.country)).size;
  const intlPct = totalSessions > 0 ? ((totalSessions - ukSessions) / totalSessions) * 100 : 0;

  const topCountriesBarData = gscCountries.slice(0, 8).map((c) => ({
    country: c.country.toUpperCase().slice(0, 3),
    clicks: c.clicks,
    fullName: c.country.toUpperCase(),
  }));

  const maxGscClicks = Math.max(...gscCountries.map((c) => c.clicks), 1);
  const maxGeo = Math.max(...gaGeo.map((g) => g.sessions), 1);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Geographic Insights" subtitle="Where your visitors are coming from — GA4 & Search Console" dateRange={range} onDateRangeChange={setRange} onRefresh={fetchAll} loading={loading} />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBlock label="UK Sessions" value={formatNumber(ukSessions)} sub={`${totalSessions > 0 ? formatPercent((ukSessions / totalSessions) * 100) : "—"} of total traffic`} icon={Globe} color={BRAND} />
          <StatBlock label="Countries" value={String(uniqueCountries)} sub="Unique countries visiting" icon={MapPin} color="#6366f1" />
          <StatBlock label="Top Organic Country" value={gscCountries[0]?.country?.toUpperCase() ?? "—"} sub={gscCountries[0] ? `${formatNumber(gscCountries[0].clicks)} clicks` : "No data"} icon={TrendingUp} color="#22c55e" />
          <StatBlock label="International" value={formatPercent(intlPct)} sub="Non-UK traffic share" icon={Users} color="#f59e0b" />
        </div>

        {/* Bar chart for top countries */}
        <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm p-5">
          <h3 className="font-semibold text-[#c9d1d9] text-sm mb-1">Organic Clicks by Country</h3>
          <p className="text-xs text-[#6e7681] mb-4">Which countries find you in Google Search Console</p>
          {loading ? <div className="h-64 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topCountriesBarData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="country" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={35} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-lg px-3 py-2.5 text-xs space-y-1">
                        <p className="font-semibold text-[#8b949e]">{d?.fullName}</p>
                        <p>Clicks: <span className="font-bold">{formatNumber(d?.clicks)}</span></p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="clicks" radius={[6, 6, 0, 0]}>
                  {topCountriesBarData.map((_, i) => <Cell key={i} fill={COUNTRY_COLORS[i] ?? "#9ca3af"} />)}
                  <LabelList dataKey="clicks" position="top" style={{ fontSize: 10, fill: "#9ca3af" }} formatter={(v: unknown) => formatNumber(v as number)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#21262d]">
              <h3 className="font-semibold text-[#c9d1d9] text-sm">Countries — Search Console</h3>
              <p className="text-xs text-[#6e7681] mt-0.5">Clicks, impressions and position by country</p>
            </div>
            <div className="px-4 py-1">
              {loading ? <div className="h-48 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
                gscCountries.map((c, i) => (
                  <CountryBar key={i} rank={i+1} country={c.country.toUpperCase()} clicks={c.clicks} impressions={c.impressions} ctr={c.ctr} position={c.position} max={maxGscClicks} color={COUNTRY_COLORS[i] ?? "#9ca3af"} />
                ))
              )}
            </div>
          </div>

          <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#21262d]">
              <h3 className="font-semibold text-[#c9d1d9] text-sm">Cities — Google Analytics</h3>
              <p className="text-xs text-[#6e7681] mt-0.5">Top GA4 sessions by city</p>
            </div>
            <div className="px-4 py-1">
              {loading ? <div className="h-48 flex items-center justify-center text-[#6e7681] text-sm">Loading…</div> : (
                gaGeo.slice(0, 15).map((g, i) => (
                  <CityRow key={i} rank={i+1} city={g.city} country={g.country} sessions={g.sessions} max={maxGeo} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* International opportunity */}
        <Card title="🌍 International Opportunity" subtitle="Cawarden ships nationwide and globally — here's how to grow it">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-[#0a1420] border border-blue-100 rounded-xl">
              <p className="font-semibold text-blue-900">Target Irish &amp; European Architects</p>
              <p className="text-[#79c0ff] mt-1 text-xs leading-relaxed">Period properties in Ireland and France regularly look for authentic Victorian/Georgian era reclaimed materials. Create targeted landing pages with international shipping info and pricing.</p>
            </div>
            <div className="p-4 bg-[#0a1a12] border border-green-100 rounded-xl">
              <p className="font-semibold text-green-900">hreflang &amp; Currency Display</p>
              <p className="text-[#56d364] mt-1 text-xs leading-relaxed">For non-UK visitors finding you via Google, showing prices in their currency (EUR, USD) and adding international delivery info can significantly improve conversion rates.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
