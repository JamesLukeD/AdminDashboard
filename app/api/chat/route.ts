import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

// Extra page-specific fetches on top of the global snapshot
const PAGE_EXTRA_FETCHES: Record<string, Array<{ label: string; url: string }>> = {
  "/dashboard/traffic": [
    { label: "Channel breakdown", url: "/api/analytics?type=channels&days=28" },
    { label: "Top pages by sessions", url: "/api/analytics?type=pages&days=28&limit=15" },
  ],
  "/dashboard/seo": [
    { label: "Top GSC queries", url: "/api/search-console?type=queries&days=28&limit=30" },
    { label: "Top GSC pages", url: "/api/search-console?type=pages&days=28&limit=15" },
  ],
  "/dashboard/seo/rank-tracker": [
    { label: "Keyword rankings", url: "/api/rank-tracker" },
  ],
  "/dashboard/opportunities": [
    { label: "SEO opportunities", url: "/api/search-console?type=opportunities&days=28" },
  ],
  "/dashboard/competitors/live": [
    { label: "SEMrush live competitor data", url: "/api/semrush-live" },
  ],
  "/dashboard/competitors/keyword-gap": [
    { label: "Top GSC queries (for gap analysis)", url: "/api/search-console?type=queries&days=28&limit=30" },
  ],
  "/dashboard/geo": [
    { label: "Geographic breakdown", url: "/api/analytics?type=geo&days=28" },
    { label: "GSC by country", url: "/api/search-console?type=countries&days=28" },
  ],
};

async function fetchLiveContext(baseUrl: string, currentPage?: string): Promise<string> {
  const lines: string[] = [];

  const pageLabel = currentPage
    ? (currentPage.replace("/dashboard", "") || "/").replace(/\//g, " › ").replace(/^ › /, "") || "Dashboard"
    : "Dashboard";

  lines.push("=== CAWARDEN ADMIN DASHBOARD — LIVE BRIEFING ===");
  lines.push(`Current page: ${pageLabel}`);
  lines.push(`Date: ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
  lines.push("");

  // Always fetch the full dashboard snapshot + rank tracker + task queue in parallel
  const globalFetches: Array<{ label: string; url: string }> = [
    { label: "Full dashboard snapshot (GA4 + GSC + opportunities)", url: "/api/dashboard?range=28d" },
    { label: "Keyword rankings", url: "/api/rank-tracker" },
    { label: "AI Task Queue (pending + completed tasks)", url: "/api/ai-tasks" },
  ];

  // If there's cached SEMrush data, include it too (read-only, no API units spent)
  const pageFetches = (currentPage && PAGE_EXTRA_FETCHES[currentPage]) ?? [];

  const allFetches = [...globalFetches, ...pageFetches];

  const results = await Promise.allSettled(
    allFetches.map(async ({ label, url }) => {
      const res = await fetch(`${baseUrl}${url}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      return { label, data: compactData(data, 25) };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      lines.push(`--- ${result.value.label} ---`);
      lines.push(JSON.stringify(result.value.data, null, 2));
      lines.push("");
    }
  }

  lines.push("--- BUSINESS CONTEXT ---");
  lines.push("Site: cawardenreclaim.co.uk");
  lines.push("Business: Reclaimed building materials — bricks, tiles, stone, timber. Based in Yorkshire, UK.");
  lines.push("Tracked competitors: Hadley (hadleygroup.com), Reclaimed Brick Company (reclaimedbrickcompany.co.uk), Jim Wise (jimwisereclamation.co.uk), Gardiners (gardinersreclaims.co.uk), The Reclaimed Company (thereclaimedcompany.co.uk)");
  lines.push("");
  lines.push("=== INSTRUCTIONS ===");
  lines.push("You are the Cawarden AI — an embedded SEO analyst inside this dashboard.");
  lines.push("You have the live data above. Use it. Quote specific numbers. Be direct and actionable.");
  lines.push("");
  lines.push("BEFORE making any recommendations:");
  lines.push("  1. Check the AI Task Queue above — anything marked [ ] Todo is PENDING (don't re-suggest it)");
  lines.push("  2. Anything marked [x] Done is ALREADY BUILT — do not recommend it again");
  lines.push("  3. Review the Copilot notes on completed tasks to understand what changed");
  lines.push("");
  lines.push("Where relevant, proactively flag:");
  lines.push("  - Keywords dropping in rank that need attention");
  lines.push("  - Quick-win opportunities (positions 4-15 with decent impressions)");
  lines.push("  - Traffic trends (rising or falling pages/channels)");
  lines.push("  - Anything anomalous or worth acting on");
  lines.push("");
  lines.push("Do NOT say you don't have data — you have it above. Do NOT ask clarifying questions unless truly necessary.");
  lines.push("=== USER'S QUESTION FOLLOWS ===");
  lines.push("");

  return lines.join("\n");
}

// Truncate arrays within objects to avoid oversized prompts
function compactData(data: unknown, maxArr: number): unknown {
  if (Array.isArray(data)) return data.slice(0, maxArr);
  if (data && typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = compactData(v, maxArr);
    }
    return out;
  }
  return data;
}

export async function POST(req: NextRequest) {
  const { message, sessionId, currentPage } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // On new sessions (no sessionId), prepend live dashboard data as context
  let fullMessage = message;
  if (!sessionId) {
    const baseUrl = req.nextUrl.origin;
    const context = await fetchLiveContext(baseUrl, currentPage);
    fullMessage = context + message;
  }

  const args = ["agent", "--agent", "main", "--json"];
  if (sessionId) args.push("--session-id", sessionId);
  // Pass message via stdin flag so no shell escaping issues with special chars
  args.push("--message", fullMessage);

  try {
    const { stdout, stderr } = await runClaw(args);

    const raw = stdout.trim();
    if (!raw) {
      const errMsg = stderr?.trim() || "No response from agent";
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    const data = JSON.parse(raw);

    const text: string = data?.result?.payloads?.[0]?.text ?? "(no response)";
    const newSessionId: string = data?.result?.meta?.agentMeta?.sessionId ?? sessionId ?? null;

    return NextResponse.json({ text, sessionId: newSessionId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function runClaw(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("openclaw", args, { timeout: 120000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(stderr || `openclaw exited with code ${code}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
    child.on("error", reject);
  });
}
