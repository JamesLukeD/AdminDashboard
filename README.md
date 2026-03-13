# Cawarden Reclaim — Analytics Admin Panel

A Next.js admin panel that aggregates **Google Analytics 4** and **Google Search Console** data into a unified, actionable reporting dashboard.

---

## Features

| Page                    | Data Source | What It Shows                                                                     |
| ----------------------- | ----------- | --------------------------------------------------------------------------------- |
| **Overview**            | GA4 + GSC   | KPIs, sessions vs clicks chart, top queries, SEO opportunities teaser             |
| **Traffic Analytics**   | GA4         | Sessions over time, channel breakdown, top pages, device split, city-level geo    |
| **SEO Performance**     | GSC         | Organic clicks/impressions, top queries table, top pages, device search breakdown |
| **SEO Opportunities**   | GSC         | Auto-identified quick wins, CTR improvement targets, Cawarden-specific tips       |
| **Product Performance** | GA4         | Sessions/pageviews/time per product category (bricks, tiles, flooring, etc.)      |
| **Geographic Insights** | GA4 + GSC   | UK vs international traffic, country rankings, city breakdown                     |

---

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **Recharts** for all charts
- **googleapis** Node.js client for GA4 Data API v1 + Search Console API v1
- Google **Service Account** authentication (no end-user login required)

---

## Setup

### 1. Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable these two APIs:
   - **Google Analytics Data API**
   - **Google Search Console API**

### 2. Service Account

1. Go to **IAM & Admin → Service Accounts**
2. Create a new service account (e.g. `cawarden-analytics`)
3. Create a JSON key and download it

### 3. Grant Access

**For GA4:**

- Go to GA4 Admin → Property Access Management
- Add the service account email as a **Viewer**

**For Search Console:**

- Go to [Search Console](https://search.google.com/search-console) → Settings → Users & Permissions
- Add the service account email

### 4. Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GA4_PROPERTY_ID=123456789
GSC_SITE_URL=https://cawardenreclaim.co.uk/
```

> **Tip:** Copy the `private_key` field from the downloaded JSON file. In `.env.local`, replace literal newlines in the key with `\n`.

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect to `/dashboard`.

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── analytics/route.ts       GA4 API endpoint
│   │   ├── search-console/route.ts  GSC API endpoint
│   │   └── dashboard/route.ts       Combined summary endpoint
│   └── dashboard/
│       ├── page.tsx                 Overview
│       ├── traffic/page.tsx         Traffic Analytics
│       ├── seo/page.tsx             SEO Performance
│       ├── opportunities/page.tsx   SEO Opportunities
│       ├── products/page.tsx        Product Category Performance
│       └── geo/page.tsx             Geographic Insights
├── components/
│   ├── charts/                      Recharts wrappers
│   ├── ui/                          StatCard, Card, Badge
│   ├── sidebar.tsx
│   └── header.tsx
├── lib/
│   ├── google-auth.ts               Service account auth
│   ├── analytics.ts                 GA4 Data API helpers
│   ├── search-console.ts            GSC API helpers
│   └── utils.ts                     Formatting utilities
└── types/analytics.ts               TypeScript types
```

---

## API Endpoints

### `GET /api/analytics?type=<type>&range=<range>`

| `type`     | Returns                                         |
| ---------- | ----------------------------------------------- |
| `overview` | Sessions, users, pageviews, bounce rate, deltas |
| `channels` | Sessions by acquisition channel                 |
| `pages`    | Top pages by sessions                           |
| `devices`  | Device breakdown                                |
| `geo`      | Top cities by sessions                          |
| `daily`    | Daily sessions + users time series              |
| `products` | Performance by Cawarden product category        |

### `GET /api/search-console?type=<type>&range=<range>`

| `type`          | Returns                                      |
| --------------- | -------------------------------------------- |
| `overview`      | Total clicks, impressions, CTR, avg position |
| `queries`       | Top queries by clicks                        |
| `pages`         | Top pages by organic clicks                  |
| `countries`     | Clicks by country                            |
| `devices`       | Clicks by device                             |
| `daily`         | Daily clicks/impressions time series         |
| `opportunities` | Auto-identified SEO opportunities            |

**Range options:** `7d` · `28d` · `90d` · `180d`

---

## Deployment

Works on **Vercel** with zero config. Set the environment variables in the Vercel dashboard.

For other platforms, run:

```bash
npm run build
npm start
```

---

## Ideas for Further Development

- [ ] **Conversion tracking** — link GA4 goal completions (contact forms, phone clicks) to organic queries
- [ ] **Competitor keyword gap** — integrate Ahrefs/SEMrush API to identify terms competitors rank for but Cawarden doesn't
- [ ] **Stock × Demand correlation** — cross reference popular search terms with current stock levels
- [ ] **Email digest** — scheduled weekly summary email using Resend or SendGrid
- [ ] **Google Business Profile** — integrate GMB API for reviews, local impressions, and direction requests
- [ ] **Anomaly alerts** — detect traffic drops > 20% and surface as notifications
- [ ] **Page speed integration** — Google PageSpeed Insights API to flag slow product pages
- [ ] **Multi-property** — support tracking both cawardenreclaim.co.uk and ukaa.com in one panel
# AdminDashboard
