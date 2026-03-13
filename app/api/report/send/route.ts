import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getTrafficOverview, getChannelBreakdown, getTopPages } from "@/lib/analytics";
import { getGSCOverview, getTopQueries, getSEOOpportunities } from "@/lib/search-console";
import { formatNumber, formatPercent, formatPosition } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

function changeArrow(n: number | undefined) {
  if (!n) return "";
  return n > 0 ? `▲ +${n}%` : `▼ ${n}%`;
}

function changeColor(n: number | undefined) {
  if (!n) return "#6b7280";
  return n > 0 ? "#16a34a" : "#dc2626";
}

export async function POST(req: NextRequest) {
  const to = process.env.REPORT_TO_EMAIL;
  const from = process.env.REPORT_FROM_EMAIL ?? "reports@cawardenreclaim.co.uk";

  if (!process.env.RESEND_API_KEY || !to) {
    return NextResponse.json(
      { error: "RESEND_API_KEY and REPORT_TO_EMAIL must be set in .env.local" },
      { status: 500 }
    );
  }

  const { range = "28d" } = await req.json().catch(() => ({ range: "28d" }));
  const rangeLabel: Record<string, string> = {
    "7d": "last 7 days",
    "28d": "last 28 days",
    "90d": "last 90 days",
    "180d": "last 6 months",
  };

  const [ga, gsc, topQueries, , opportunities] = await Promise.all([
    getTrafficOverview(range),
    getGSCOverview(range),
    getTopQueries(range, 5),
    getTopPages(range, 5),
    getSEOOpportunities(range),
    getChannelBreakdown(range),
  ]);

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const topOpps = opportunities.slice(0, 3);

  const queryRows = topQueries.map((q) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6">${q.query}</td>
      <td style="padding:8px 12px;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6">${formatNumber(q.clicks)}</td>
      <td style="padding:8px 12px;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6">${formatNumber(q.impressions)}</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;color:${q.position <= 3 ? "#16a34a" : q.position <= 10 ? "#2563eb" : "#d97706"}">#${formatPosition(q.position)}</td>
    </tr>`).join("");

  const oppRows = topOpps.map((o) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6">${o.query}</td>
      <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6">${o.recommendation}</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#d4721e;text-align:right;border-bottom:1px solid #f3f4f6">+${formatNumber(o.potentialClicks)} clicks</td>
    </tr>`).join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#d4721e,#9c4215);border-radius:12px 12px 0 0;padding:28px 32px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#fff;vertical-align:middle;margin-right:12px">CR</div>
                  <span style="font-size:18px;font-weight:700;color:#fff;vertical-align:middle">Cawarden Reclaim</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top:8px">
                  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.8)">Analytics Report · ${rangeLabel[range] ?? range} · Generated ${today}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- KPI Grid -->
        <tr>
          <td style="background:#fff;padding:28px 32px">
            <h2 style="margin:0 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">Website Traffic</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${[
                  { label: "Sessions", value: formatNumber(ga.sessions), change: ga.sessionsChange },
                  { label: "Users", value: formatNumber(ga.users), change: ga.usersChange },
                  { label: "Page Views", value: formatNumber(ga.pageviews), change: ga.pageviewsChange },
                  { label: "New Users", value: formatNumber(ga.newUsers), change: null },
                ].map((m) => `
                  <td width="25%" style="padding:0 8px 0 0;vertical-align:top">
                    <div style="background:#f9fafb;border-radius:10px;padding:14px">
                      <p style="margin:0 0 4px;font-size:11px;color:#6b7280;font-weight:500">${m.label}</p>
                      <p style="margin:0;font-size:20px;font-weight:700;color:#111827">${m.value}</p>
                      ${m.change !== null && m.change !== undefined ? `<p style="margin:4px 0 0;font-size:11px;font-weight:600;color:${changeColor(m.change)}">${changeArrow(m.change)}</p>` : ""}
                    </div>
                  </td>`).join("")}
              </tr>
            </table>

            <h2 style="margin:24px 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">Organic Search (GSC)</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${[
                  { label: "Organic Clicks", value: formatNumber(gsc.totalClicks), change: gsc.clicksChange },
                  { label: "Impressions", value: formatNumber(gsc.totalImpressions), change: gsc.impressionsChange },
                  { label: "Avg. CTR", value: formatPercent(gsc.avgCtr), change: null },
                  { label: "Avg. Position", value: `#${formatPosition(gsc.avgPosition)}`, change: null },
                ].map((m) => `
                  <td width="25%" style="padding:0 8px 0 0;vertical-align:top">
                    <div style="background:#f9fafb;border-radius:10px;padding:14px">
                      <p style="margin:0 0 4px;font-size:11px;color:#6b7280;font-weight:500">${m.label}</p>
                      <p style="margin:0;font-size:20px;font-weight:700;color:#111827">${m.value}</p>
                      ${m.change !== null && m.change !== undefined ? `<p style="margin:4px 0 0;font-size:11px;font-weight:600;color:${changeColor(m.change)}">${changeArrow(m.change)}</p>` : ""}
                    </div>
                  </td>`).join("")}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Top Queries -->
        <tr>
          <td style="background:#fff;padding:0 32px 28px;border-top:1px solid #f3f4f6">
            <h2 style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">Top Search Queries</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:8px;overflow:hidden">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-align:left;border-bottom:1px solid #f3f4f6">Query</th>
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6">Clicks</th>
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6">Impr.</th>
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6">Position</th>
                </tr>
              </thead>
              <tbody>${queryRows}</tbody>
            </table>
          </td>
        </tr>

        <!-- SEO Opportunities -->
        ${topOpps.length > 0 ? `
        <tr>
          <td style="background:#fff;padding:0 32px 28px;border-top:1px solid #f3f4f6">
            <h2 style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">Top SEO Opportunities</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:8px;overflow:hidden">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-align:left;border-bottom:1px solid #f3f4f6">Keyword</th>
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-align:left;border-bottom:1px solid #f3f4f6">Action</th>
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6">Potential</th>
                </tr>
              </thead>
              <tbody>${oppRows}</tbody>
            </table>
          </td>
        </tr>` : ""}

        <!-- Footer -->
        <tr>
          <td style="background:#1f2937;border-radius:0 0 12px 12px;padding:20px 32px">
            <p style="margin:0;font-size:12px;color:#9ca3af">Generated by Cawarden Analytics Hub · <a href="https://cawardenreclaim.co.uk" style="color:#d4721e;text-decoration:none">cawardenreclaim.co.uk</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject: `Cawarden Analytics Report — ${rangeLabel[range] ?? range} (${today})`,
      html,
    });
    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
