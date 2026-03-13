# AI Task Queue

Shared task board between **OpenClaw** (SEO analyst) and **GitHub Copilot** (developer).

**Workflow:**

1. OpenClaw analyses live dashboard data → uses the "📌 Log as task" button (or writes here directly) to queue a recommendation
2. You open VS Code and say _"implement the next task"_ → Copilot reads this file and builds it
3. Copilot marks it done and notes what was changed
4. OpenClaw reviews progress next session

---

## Task Format

```
### TASK-001 — Title
- **Priority:** High / Medium / Low
- **Source:** OpenClaw / Manual
- **Logged:** YYYY-MM-DD
- **Status:** [ ] Todo / [~] In Progress / [x] Done
- **Description:** What needs doing and why
- **Notes:** (Copilot adds implementation notes here when done)
```

---

## 🔴 High Priority

_Nothing here yet._

## 🟡 Medium Priority

_Nothing here yet._

## 🟢 Low Priority

_Nothing here yet._

---

## ✅ Completed

### TASK-003 — Branded vs non-branded query split
- **Priority:** High
- **Source:** OpenClaw
- **Logged:** 2026-03-11
- **Status:** [x] Done
- **Description:** Tag each query in topQueries as branded/non-branded. Add a split metric to the GSC overview showing % of clicks from branded vs non-branded terms. Currently 6 of top 10 queries are branded — no way to track non-branded growth over time.
- **Notes:** Implemented by Copilot. Added branded/non-branded split to `/dashboard/seo` — queries containing "cawarden" counted as branded. Shows two progress bars with click counts and percentages, plus a contextual insight line. Computed client-side from existing query data, no new API calls.

### TASK-004 — Position change delta on opportunities
- **Priority:** High
- **Source:** OpenClaw
- **Logged:** 2026-03-11
- **Status:** [x] Done
- **Description:** Add positionChange field to each opportunity entry showing movement vs prior period (e.g. +2.3 or -1.1). Currently shows current position only — no way to see if rankings are improving or dropping.
- **Notes:** Implemented by Copilot. `getSEOOpportunities()` now fetches current + previous period in parallel. `positionChange` added to `SEOOpportunity` type. Each OpportunityCard shows a green ▲ or red ▼ badge with the delta. Null when no previous period data exists.

### TASK-005 — Zero-CTR alert section
- **Priority:** High
- **Source:** OpenClaw
- **Logged:** 2026-03-11
- **Status:** [x] Done
- **Description:** Add a dedicated alert for pages ranking in top 5 with >200 impressions but 0% CTR. Rosemary tiles (pos 2.0, 672 impressions, 0 clicks) and bullnose brick (pos 2.2, 515 impressions, 0 clicks) buried in the opportunities list.
- **Notes:** Implemented by Copilot. Red alert section added to `/dashboard/seo` between position distribution and query table. Filters queries: position ≤ 5, impressions ≥ 200, clicks = 0. Shows keyword, position, impression count and "0 clicks" in red. Only renders when matches exist.

### TASK-002 — Here are the most impactful improvements based on what I can see in the data:
- **Priority:** High
- **Source:** OpenClaw
- **Logged:** 2026-03-11
- **Status:** [x] Done
- **Description:** Here are the most impactful improvements based on what I can see in the data: **1. Alert on the March traffic cliff** Sessions dropped from 1,043 on Feb 28 to 251 on Mar 1 — a 76% overnight drop. The dashboard shows this in the chart but doesn't flag it as an anomaly. You need an automated alert when daily sessions drop >30% day-on-day so you'd catch that immediately. **2. Add conversion rate per channel, not just conversions** Right now you can see Paid Search got 674 conversions from 3,494 ses
- **Notes:** Implemented by Copilot. (1) Added `trafficAnomalies` computation to dashboard page — scans `dailyTraffic` for >30% day-over-day drops (ignoring days with <50 baseline sessions) and shows an amber alert banner above insights when triggered. (2) Added conversion rate (`conversions / sessions * 100`) to the channel breakdown bar on the main dashboard and as a green `% cvr` badge in the traffic page channel list.
