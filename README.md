# CRM-AI

An AI-assisted B2B sales CRM. Generate and score leads with Claude, run multi-step outreach
sequences, and track deals through a drag-and-drop pipeline — multi-tenant, with per-org billing
and role-based access.

Built for [Pavion Technologies](https://paviontechnologies.com).

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Data model](#data-model)
- [How the campaign engine works](#how-the-campaign-engine-works)
- [Deployment](#deployment)
- [Known gaps](#known-gaps)

---

## Features

### Lead intelligence
- **AI lead generation** — describe an industry and city; Claude drafts a batch of matching
  companies, deduplicated against your existing leads by email.
- **AI intent scoring** — each lead gets an intent score, ICP score, urgency and budget estimate
  with written reasoning and a recommended next action.
- **Custom qualification prompts** — define what a good lead looks like for *your* business
  (`AI Qualification` page). Those instructions are injected into every scoring call.
- **CSV / bulk import** with automatic de-duplication.
- **Lead detail view** — activity timeline, notes, tasks, messages and file attachments in one place.

### Pipeline & deals
- Drag-and-drop kanban board across configurable stages, with optimistic moves.
- Per-stage deal counts and total value in play.
- Mark deals won/lost with a lost-reason; every move is written to the linked lead's timeline.
- Multiple pipelines per organisation.

### Outreach
- Multi-step campaign sequences (email / WhatsApp / LinkedIn) with per-step day offsets.
- **A background scheduler actually sends them** over SMTP — see
  [How the campaign engine works](#how-the-campaign-engine-works).
- Open tracking via a 1×1 pixel; opens land on the lead timeline.
- AI-drafted outreach per lead, saved as a draft message you can review.

### Team & operations
- Tasks with due dates, priorities, assignment and overdue/today filters.
- Notes and file attachments on leads and deals.
- In-app notification bell (task assigned, lead assigned).
- Team invites with expiring tokens, roles: `SUPERADMIN` / `ADMIN` / `AGENT` / `VIEWER`.
- Analytics dashboard — leads by source/status/industry, weekly trend, campaign performance.
- Stripe subscriptions with plan tiers and usage metering.
- Superadmin panel for cross-org stats and niche templates.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4 |
| State / data | Zustand, Axios with refresh-token interceptor |
| UI | lucide-react, Recharts, @dnd-kit, framer-motion |
| Backend | Node.js 20+, Express 4, TypeScript |
| Database | PostgreSQL (Neon) via Prisma 6 |
| AI | Anthropic Claude (`claude-haiku-4-5`) |
| Auth | JWT access tokens + hashed refresh tokens in httpOnly cookies |
| Email | Nodemailer (SMTP) |
| Payments | Stripe Checkout + webhooks |

---

## Getting started

### Prerequisites
- Node.js **20.9+** (Next.js 16 requirement)
- A PostgreSQL database — [Neon](https://neon.tech) works well and is what the config assumes

### 1. Clone and install

```bash
git clone <repo-url>
cd CRM-AI

cd backend  && npm install
cd ../frontend && npm install
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Fill in `DATABASE_URL` and `DIRECT_URL` at minimum — see
[Environment variables](#environment-variables). Everything else is optional and degrades
gracefully (AI returns mock scores, emails log to the console, Stripe returns a mock checkout URL).

### 3. Create the schema

```bash
npm run prisma:push     # or: npm run prisma:migrate
npm run seed            # optional — demo org with leads, deals and campaigns
```

The seed prints its login credentials when it finishes.

### 4. Configure the frontend

```bash
cd ../frontend
cp .env.example .env.local
```

```bash
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### 5. Run both

```bash
# terminal 1
cd backend && npm run dev      # http://localhost:5001

# terminal 2
cd frontend && npm run dev     # http://localhost:3000
```

Health check: `curl http://localhost:5001/health`

---

## Environment variables

### `backend/.env`

**Required**

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Use the **pooled** URL on Neon. |
| `DIRECT_URL` | Non-pooled URL, used by `prisma migrate`. Set it to the same value if you only have one. |
| `JWT_SECRET` | Long random string. **Change this before deploying.** |

**Optional — each one degrades gracefully when unset**

| Variable | Default behaviour when unset |
| --- | --- |
| `PORT` | `5001` |
| `FRONTEND_URL` | `http://localhost:3000` — also the CORS origin |
| `PUBLIC_API_URL` | Base URL used to build open-tracking pixel links. Set this in production. |
| `ANTHROPIC_API_KEY` | AI scoring and generation return plausible mock data |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Emails are logged to the console instead of sent |
| `GOOGLE_CLIENT_ID` | `POST /api/auth/google` returns 501 |
| `STRIPE_SECRET_KEY` | Checkout returns a mock success URL |
| `STRIPE_WEBHOOK_SECRET` | Webhook rejects all events |
| `STRIPE_STARTER_PRICE_ID` / `STRIPE_GROWTH_PRICE_ID` / `STRIPE_AGENCY_PRICE_ID` | Placeholder price IDs |
| `CAMPAIGN_TICK_MS` | `60000` — how often the scheduler looks for due steps |
| `CAMPAIGN_DAY_MS` | `86400000` — how long one "day" of a sequence lasts |
| `CAMPAIGN_BATCH_SIZE` | `25` — enrollments processed per tick |
| `CAMPAIGN_SCHEDULER` | Set to `off` to disable the scheduler entirely |
| `UPLOAD_DIR` | `uploads` — where attachments are written |
| `MAX_UPLOAD_BYTES` | `10485760` (10 MB) |

> **Never commit a real `.env`.** Both `.env` and `uploads/` are gitignored.

### `frontend/.env.local`

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend API base, including `/api` |

---

## Project structure

```
CRM-AI/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # 21 models
│   │   └── seed.ts                # demo org, leads, deals, campaigns
│   └── src/
│       ├── controllers/           # request handlers, one per domain
│       ├── routes/                # express routers
│       ├── services/
│       │   ├── ai.service.ts          # Claude calls + mock fallbacks
│       │   ├── email.service.ts       # nodemailer wrappers
│       │   └── campaign.scheduler.ts  # background sequence worker
│       ├── middleware/auth.middleware.ts   # authenticate + requireRole
│       ├── lib/
│       │   ├── prisma.ts
│       │   └── notify.ts          # notifications + activity logging helpers
│       └── index.ts               # app wiring, error handlers, scheduler boot
│
└── frontend/src/
    ├── app/
    │   ├── (auth)/                # login, register
    │   └── (dashboard)/           # authenticated shell + pages
    │       ├── leads/[id]/        # lead detail with tabs
    │       ├── pipeline/          # drag-and-drop deal board
    │       ├── tasks/
    │       ├── campaigns/
    │       ├── workflows/         # AI qualification prompt editor
    │       └── ...
    ├── components/
    │   ├── layout/                # Sidebar, NotificationBell
    │   └── leads/                 # import + generate modals
    ├── lib/api.ts                 # axios instance + token refresh
    └── store/auth.store.ts        # zustand auth state
```

---

## API reference

Base URL: `/api`. All routes require `Authorization: Bearer <token>` unless marked **public**.

<details>
<summary><b>Auth</b> — <code>/api/auth</code></summary>

| Method | Path | Description |
| --- | --- | --- |
| POST | `/register` | **Public.** Creates user + org + default pipeline |
| POST | `/login` | **Public** |
| POST | `/google` | **Public.** Google ID-token sign-in |
| POST | `/forgot-password` | **Public.** Sends an OTP |
| POST | `/verify-otp` | **Public** |
| POST | `/refresh` | **Public.** Rotates the access token from the refresh cookie |
| GET | `/me` | Current user, org and role |
| PATCH | `/me` | Update profile |
| PATCH | `/org` | Update org name, logo, AI qualification prompt (admin only) |
| PATCH | `/password` | Change password |

</details>

<details>
<summary><b>Leads</b> — <code>/api/leads</code></summary>

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Paginated list. Filters: `status`, `industry`, `city`, `search`, `sortBy`, `sortDir` |
| POST | `/` | Create (409 on duplicate email) |
| GET | `/:id` | Full detail — scores, activities, messages, deals, tasks, notes, attachments |
| PUT | `/:id` | Update (whitelisted fields only) |
| DELETE | `/:id` | Soft delete |
| PATCH | `/:id/status` | Change status, logged to the timeline |
| POST | `/import` | Bulk import with de-duplication |
| POST | `/generate` | AI lead generation |
| POST | `/:id/score` | AI intent scoring |
| POST | `/:id/outreach` | AI outreach draft, saved as a message |
| POST | `/outreach/preview` | Draft copy for an ad-hoc company without saving a lead |

</details>

<details>
<summary><b>Pipeline & Deals</b> — <code>/api/pipeline</code>, <code>/api/deals</code></summary>

| Method | Path | Description |
| --- | --- | --- |
| GET | `/pipeline` | Pipelines with stages and deal counts |
| POST | `/pipeline` | Create a pipeline with the 8 default stages |
| GET | `/pipeline/:id/board` | Kanban board — open deals grouped by stage |
| GET | `/deals` | Filters: `status`, `stageId`, `leadId`, `search` |
| POST | `/deals` | Create (defaults to the first stage of the default pipeline) |
| PUT | `/deals/:id` | Update |
| PATCH | `/deals/:id/move` | Move to another stage |
| PATCH | `/deals/:id/status` | `open` / `won` / `lost` |
| DELETE | `/deals/:id` | Delete |

</details>

<details>
<summary><b>Campaigns</b> — <code>/api/campaigns</code></summary>

| Method | Path | Description |
| --- | --- | --- |
| GET | `/track/:messageId/open.gif` | **Public.** Open-tracking pixel |
| GET | `/` | List with steps and enrollment counts |
| GET | `/:id` | Detail |
| POST | `/` | Create with steps |
| PUT | `/:id` | Update |
| PATCH | `/:id/status` | `draft` / `active` / `paused` / `completed` — **only `active` campaigns send** |
| DELETE | `/:id` | Delete |
| POST | `/:id/steps` | Append a sequence step |
| POST | `/:id/enroll` | Enroll leads (skips already-enrolled) |
| GET | `/:id/analytics` | Sent, opens, replies, rates |

</details>

<details>
<summary><b>Tasks, Notes, Attachments, Notifications</b></summary>

| Method | Path | Description |
| --- | --- | --- |
| GET | `/tasks` | Filters: `status`, `priority`, `assignedToId`, `leadId`, `dealId`, `scope=mine\|today\|overdue` |
| POST | `/tasks` | Create (defaults assignee to the creator) |
| GET/PUT/DELETE | `/tasks/:id` | Read / update / delete |
| PATCH | `/tasks/:id/status` | `open` / `completed` |
| GET | `/notes?leadId=&dealId=` | List notes for a lead or deal |
| POST | `/notes` | Create |
| PUT/DELETE | `/notes/:id` | Author-only edit; admins may delete any |
| GET | `/attachments?leadId=&dealId=` | List |
| POST | `/attachments` | `multipart/form-data`: `file` + `leadId` or `dealId` |
| GET | `/attachments/:id/download` | Org-scoped download |
| DELETE | `/attachments/:id` | Delete file and record |
| GET | `/notifications` | List + unread count |
| PATCH | `/notifications/read-all` | Mark all read |
| PATCH | `/notifications/:id/read` | Mark one read |
| DELETE | `/notifications/:id` | Delete |

</details>

<details>
<summary><b>Analytics, Team, Billing, Admin</b></summary>

| Method | Path | Description |
| --- | --- | --- |
| GET | `/analytics/dashboard` | Headline KPIs |
| GET | `/analytics/leads/{source,status,industry,weekly}` | Breakdowns |
| GET | `/analytics/campaigns` | Campaign performance |
| GET | `/analytics/activities` | Recent activity feed |
| GET | `/team` | Members + pending invites |
| POST | `/team/invite` | Invite by email (admin) |
| POST | `/team/accept/:token` | **Public.** Accept an invite |
| PATCH | `/team/:memberId/role` | Change role (admin) |
| DELETE | `/team/:memberId` | Remove member (admin) |
| GET | `/billing/plans` | **Public.** Plan catalogue |
| GET | `/billing/subscription` | Current plan, limits and usage |
| POST | `/billing/checkout` | Stripe Checkout session |
| POST | `/billing/webhook` | **Public.** Stripe webhook (signature-verified) |
| GET | `/billing/usage` | Month-to-date usage by type |
| GET | `/admin/{orgs,users,stats,templates}` | Superadmin only |

</details>

---

## Data model

21 Prisma models. The relationships that matter:

```
Organization ─┬─ TeamMember ── User
              ├─ Subscription
              ├─ Lead ─┬─ LeadScore      (AI scoring history)
              │        ├─ Activity       (timeline)
              │        ├─ Message        (outreach, inbound/outbound)
              │        └─ CampaignEnrollment
              ├─ Pipeline ── PipelineStage ── Deal
              ├─ Campaign ── CampaignStep
              ├─ Task        (→ Lead or Deal)
              ├─ Note        (→ Lead or Deal)
              ├─ Attachment  (→ Lead or Deal)
              ├─ Notification
              └─ UsageLog
```

Every tenant-scoped query filters on `organizationId`, taken from the JWT — never from the request
body.

---

## How the campaign engine works

`src/services/campaign.scheduler.ts` boots with the server and runs on an interval.

1. Every `CAMPAIGN_TICK_MS`, it selects up to `CAMPAIGN_BATCH_SIZE` enrollments where
   `status = active`, `nextRunAt <= now`, **and the parent campaign is `active`**.
2. For each one it renders the current step — `{{companyName}}`, `{{contactName}}`, `{{city}}` and
   any other lead field are substituted — and writes a `Message` row.
3. Email steps are sent over SMTP with a tracking pixel appended. Other channels are recorded as
   drafts so the sequence still advances and the work stays visible.
4. On success it increments the campaign's `sentCount`, the org's email credits, and writes a
   `UsageLog` row and a lead activity.
5. The enrollment advances to the next step with `nextRunAt = now + dayOffset × CAMPAIGN_DAY_MS`,
   or completes if there are no steps left.

Design notes worth knowing:

- **A campaign only sends when its status is `active`.** Use the Activate button on the campaigns
  page, or `PATCH /api/campaigns/:id/status`.
- **Sequences advance even when a send fails**, so one bad email address cannot wedge a lead
  forever. Failures are recorded on the message row.
- **Without SMTP configured, nothing is sent** — messages are logged to the console and marked as
  not sent. Safe to develop against.
- **Overlapping ticks are guarded**, and a step that throws backs that single enrollment off by
  15 minutes rather than spinning the loop.

To smoke-test a multi-day sequence in a couple of minutes, set `CAMPAIGN_DAY_MS=60000`.

---

## Deployment

Dockerfiles are included for both services.

```bash
docker build -t crm-ai-backend  ./backend
docker build -t crm-ai-frontend ./frontend
```

Production checklist:

- [ ] Set a strong `JWT_SECRET` (not the dev default)
- [ ] Set `FRONTEND_URL` to the real origin — it drives CORS
- [ ] Set `PUBLIC_API_URL` so open-tracking pixels resolve
- [ ] Run `prisma migrate deploy` rather than `db push`
- [ ] Point the Stripe webhook at `POST /api/billing/webhook` and set `STRIPE_WEBHOOK_SECRET`
- [ ] Move attachment storage off local disk (S3 or similar) if you run more than one instance —
      uploads currently write to `UPLOAD_DIR` on the local filesystem
- [ ] Run the scheduler on exactly one instance, or set `CAMPAIGN_SCHEDULER=off` on the others
- [ ] Review [Known gaps](#known-gaps) below

---

## Known gaps

Being upfront about what is not done yet:

- **Plan limits are not enforced.** `leadLimit`, `aiLimit` and friends are stored and displayed,
  but nothing blocks an org from exceeding them.
- **No rate limiting.** The login endpoint in particular should be throttled before this is
  publicly exposed.
- **No automated tests** and no CI pipeline.
- **Reply tracking is not wired.** `replyCount` stays at zero — it needs inbound email handling
  (IMAP polling or an inbound webhook). Open tracking does work.
- **WhatsApp / LinkedIn / SMS steps are recorded but not delivered.** Only email actually sends.
- **Attachments are stored on local disk**, which does not survive horizontal scaling or most
  container restarts.
- **No structured logging or request IDs** — `morgan` only.

---

## Scripts

**Backend**

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run prisma:push` | Push schema without a migration |
| `npm run prisma:migrate` | Create and apply a migration |
| `npm run seed` | Seed demo data |

**Frontend**

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
