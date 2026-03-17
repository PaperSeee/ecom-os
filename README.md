# E-COM-OS

E-COM-OS is a premium dark dashboard for dropshipping and brand building operations.

Stack:
- Next.js App Router (15+ compatible)
- TypeScript strict
- Tailwind CSS
- Lucide React
- Recharts
- Zustand
- Supabase (SQL schema + RLS + seed included)

## Project Tree

~~~text
e-com-os/
├─ .env.example
├─ supabase/
│  ├─ schema.sql
│  └─ seed.sql
├─ src/
│  ├─ app/
│  │  ├─ (app)/
│  │  │  ├─ ads-scaling/page.tsx
│  │  │  ├─ competitors/page.tsx
│  │  │  ├─ dashboard/page.tsx
│  │  │  ├─ financial-tracker/page.tsx
│  │  │  ├─ launchpad/page.tsx
│  │  │  ├─ product-lab/page.tsx
│  │  │  └─ layout.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ charts/performance-chart.tsx
│  │  ├─ layout/
│  │  │  ├─ app-shell.tsx
│  │  │  ├─ mobile-nav.tsx
│  │  │  └─ sidebar.tsx
│  │  └─ ui/
│  │     ├─ alert-banner.tsx
│  │     ├─ progress-bar.tsx
│  │     ├─ stats-card.tsx
│  │     └─ stepper.tsx
│  ├─ data/mock.ts
│  ├─ lib/
│  │  ├─ financial.ts
│  │  ├─ supabase-client.ts
│  │  └─ utils.ts
│  ├─ stores/
│  │  ├─ launchpad-store.ts
│  │  ├─ product-store.ts
│  │  └─ ui-store.ts
│  └─ types/domain.ts
└─ package.json
~~~

## Modules Included

1. Executive Dashboard
- KPI cards (CA, Spend, Profit, ROAS, Marge nette)
- Performance chart (jour/semaine)
- Critical launch blockers alert banner

2. Product Lab
- Product CRUD (add/remove)
- Auto profitability calculator
- Uses Stripe (2.9% + 0.30 EUR) and Shopify (2%) fees
- Shows unit profit, net margin percent, break-even ROAS

3. Spy & Competitor Tracker
- Competitor base
- Niche filter + threat score slider

4. Ads & Scaling Manager
- Meta/TikTok campaign cards
- Scaling decisions log with author + timestamp

5. Financial Tracker
- Current treasury
- Inflows / outflows journal
- 30/60/90 projections
- Cash break alert

6. LaunchPad Checklist (priority)
- Interactive checklist with categories
- Task assignment Associate A / Associate B
- Critical toggle per task
- Validation with validator and timestamp
- Global progress
- Ready to Launch blocked while critical blockers exist

## Run Local (Step by Step)

1. Install dependencies

~~~bash
npm install
~~~

2. Configure env vars

~~~bash
cp .env.example .env.local
~~~

Fill:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

3. Create Supabase schema
- Open Supabase SQL Editor
- Run content of supabase/schema.sql

4. Seed data
- Update seed user UUID in supabase/seed.sql with a real auth.users id
- Run content of supabase/seed.sql

5. Start dev server

~~~bash
npm run dev
~~~

6. Open app
- http://localhost:3000

## Acceptance Mapping

- Create product and instant margin/profit/ROAS: Product Lab live calculator
- Check LaunchPad tasks and progress updates: LaunchPad page with progress bar
- Critical unchecked task triggers red banner: Dashboard + LaunchPad blocker detection
- Mobile-safe layout: bottom mobile nav + responsive cards/tables
