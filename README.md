# 🚀 ReachInbox — Production-Grade Full-Stack Email Job Scheduler

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![BullMQ](https://img.shields.io/badge/BullMQ-E33F34?style=for-the-badge&logo=redis&logoColor=white)](https://bullmq.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?style=for-the-badge&logo=elasticsearch&logoColor=white)](https://www.elastic.co/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A production-grade distributed email job scheduler built for **ReachInbox.ai** that handles large-scale email scheduling, provider rate-limiting, sender throttling, failure recovery, real-time Slack alerting, live queue monitoring via Bull Board, and full-text search with Elasticsearch.

---

## 📑 Table of Contents
1. [Architectural Overview](#-architectural-overview)
2. [Key Engineering Highlights](#-key-engineering-highlights)
3. [Tech Stack](#-tech-stack)
4. [Project Structure](#-project-structure)
5. [Quick Start & Setup Guide](#-quick-start--setup-guide)
6. [Environment Variables](#-environment-variables)
7. [How Scheduling & Persistence Work](#-how-scheduling--persistence-work)
8. [How Rate Limiting & Concurrency Work](#-how-rate-limiting--concurrency-work)
9. [Slack & Ethereal Integration](#-slack--ethereal-integration)
10. [API Reference](#-api-reference)
11. [Assumptions, Shortcuts & Trade-offs](#-assumptions-shortcuts--trade-offs)
12. [Demo Video & Submission](#-demo-video--submission)

---

## 🏗 Architectural Overview

```
                                  ┌───────────────────────────┐
                                  │      React Frontend       │
                                  │   (Vite + Tailwind CSS)   │
                                  └─────────────┬─────────────┘
                                                │ REST API / JWT
                                                ▼
                                  ┌───────────────────────────┐
                                  │    Express.js Backend     │
                                  │       (TypeScript)        │
                                  └──────┬─────────────┬──────┘
                                         │             │
                    ┌────────────────────┼─────────────┼────────────────────┐
                    ▼                    ▼             ▼                    ▼
          ┌──────────────────┐ ┌───────────────┐ ┌───────────┐ ┌───────────────────┐
          │    PostgreSQL    │ │     Redis     │ │  BullMQ   │ │   Elasticsearch   │
          │ (Prisma source   │ │ (Rate Limits  │ │  Delayed  │ │ (Full-text email  │
          │   of truth)      │ │  & Counters)  │ │   Queue   │ │     search)       │
          └──────────────────┘ └───────────────┘ └─────┬─────┘ └───────────────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │   BullMQ Worker     │
                                            │  (Concurrency: N)   │
                                            └──────────┬──────────┘
                                                       │
                                   ┌───────────────────┴───────────────────┐
                                   ▼                                       ▼
                       ┌───────────────────────┐               ┌───────────────────────┐
                       │    Ethereal SMTP      │               │   Slack Webhook       │
                       │ (Nodemailer fake send │               │ (Rate limit reached   │
                       │   with live preview)  │               │    instant alert)     │
                       └───────────────────────┘               └───────────────────────┘
```

---

## 💡 Key Engineering Highlights

| Feature | Requirement | Implementation |
|---|---|---|
| **Job Scheduling** | No cron jobs allowed (hard constraint) | BullMQ delayed jobs (`delay = scheduledAt - now`). Powered by Redis Sorted Sets (`zset`). |
| **Worker Concurrency** | Configurable concurrency | BullMQ Worker configured with `concurrency: env.WORKER_CONCURRENCY` (parallel job processing). |
| **Throttling** | Minimum delay between individual sends | BullMQ limiter (`limiter: { max: 1, duration: 2000 }`) + client-side interval spread. |
| **Hourly Rate Limiting** | Per-sender hourly limit across workers | Atomic Redis counters `ratelimit:{sender}:{hourWindow}` using `INCR` + `EXPIRE 3600`. Safe across horizontal replicas. |
| **Rate Limit Backpressure** | Do not drop or fail jobs | Reschedules jobs to `(nextHourWindowStart - now)` delay into BullMQ with status `RATE_LIMITED`. |
| **Restart Persistence** | Survive server & container restarts | **Two-tier guarantee**: Redis AOF persistence + startup database reconciler (`jobRecovery.ts`). |
| **Idempotency** | Emails must never be sent twice | Pre-execution database check (`status === 'SENT' -> skip`) + atomic state transitions. |
| **Email Search** | Searchable sent/scheduled emails | Indexed into Elasticsearch on create/update with multi-match fuzzy search + Postgres fallback. |
| **Slack Notifications** | Real webhook call on rate limit | Real incoming-webhook alert dispatched to connected user channel with next window details. |
| **Live Queue Dashboard** | Real-time queue visibility | Bull Board hosted at `/admin/queues` with active, delayed, waiting, and completed job inspection. |

---

## 🛠 Tech Stack

### Backend
- **Language**: TypeScript 5.7
- **Framework**: Express.js 4.21
- **Queue System**: BullMQ 5.34 (backed by Redis)
- **Database**: PostgreSQL 16 with Prisma ORM 6.2
- **Search Engine**: Elasticsearch 8.11
- **Email Delivery**: Nodemailer 6.9 with fake SMTP via Ethereal Email
- **Authentication**: Passport.js with Google OAuth 2.0 & JWT tokens
- **Dashboard**: `@bull-board/express` & `@bull-board/api`

### Frontend
- **Framework**: React 19 + Vite 6
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Date Handling**: date-fns 4.1
- **HTTP Client**: Axios 1.7

### Infrastructure
- **Docker Compose**: Orchestrates Redis, PostgreSQL, and Elasticsearch in isolated containers.

---

## 📁 Project Structure

```
reachinbox-email-scheduler/
├── docker-compose.yml             # Redis, Postgres, Elasticsearch services
├── .gitignore
├── README.md
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (User, Email, EmailStatus)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts            # Environment config & validation
│   │   │   ├── database.ts       # Prisma Client singleton
│   │   │   ├── redis.ts          # ioredis connection pool
│   │   │   └── elasticsearch.ts  # Elasticsearch client & index mappings
│   │   ├── controllers/
│   │   │   └── emailController.ts# Handlers for schedule, list, search, stats
│   │   ├── middleware/
│   │   │   └── auth.ts           # Google OAuth Passport strategy & JWT verification
│   │   ├── queues/
│   │   │   ├── emailQueue.ts     # BullMQ Queue instance
│   │   │   ├── emailWorker.ts    # BullMQ Worker processing logic & throttling
│   │   │   └── jobRecovery.ts    # Server restart persistence reconciler
│   │   ├── routes/
│   │   │   ├── authRoutes.ts     # /api/auth (Google OAuth, dev-login, me)
│   │   │   ├── emailRoutes.ts    # /api/emails (schedule, scheduled, sent, search)
│   │   │   └── slackRoutes.ts    # /api/slack (connect, callback, status)
│   │   ├── services/
│   │   │   ├── emailService.ts   # Ethereal Email SMTP transporter & preview
│   │   │   ├── rateLimiter.ts    # Redis atomic per-sender hourly rate limiter
│   │   │   ├── searchService.ts  # Elasticsearch indexing & Postgres fallback
│   │   │   └── slackService.ts   # Slack webhook notifications
│   │   ├── utils/
│   │   │   └── csvParser.ts      # Multi-format CSV & TXT email parser
│   │   └── index.ts              # Express bootstrap, Bull Board & graceful shutdown
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── email/
    │   │   │   ├── ComposeModal.tsx   # Modal: file upload, count, date, delay, limit
    │   │   │   ├── ScheduledEmails.tsx# Table of scheduled emails with status
    │   │   │   └── SentEmails.tsx     # Table of sent emails with Ethereal preview link
    │   │   ├── layout/
    │   │   │   └── Header.tsx         # User info, avatar, Slack status, logout
    │   │   └── ui/                    # Reusable components: Badge, Button, Input, Modal, Table
    │   ├── context/
    │   │   └── AuthContext.tsx        # React auth provider & JWT state
    │   ├── hooks/
    │   │   └── useEmails.ts           # Polling hook for real-time list updates
    │   ├── pages/
    │   │   ├── Login.tsx              # Google OAuth sign-in & quick demo login
    │   │   ├── Dashboard.tsx          # Main dashboard, stats, search & tabs
    │   │   └── AuthCallback.tsx       # OAuth redirect handler
    │   ├── services/
    │   │   └── api.ts                 # Axios API client with interceptors
    │   ├── types/
    │   │   └── index.ts               # Shared TypeScript models
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.ts
    └── tsconfig.json
```

---

## 🚀 Quick Start & Setup Guide

### 1. Prerequisites
- **Node.js** >= 18 (Tested on Node v20 & v26)
- **npm** or **yarn**
- **Docker & Docker Compose** (or local Redis + PostgreSQL instances)

---

### 2. Start Infrastructure (Docker)
From the root directory:
```bash
docker-compose up -d
```
This spins up:
- **Redis** on `localhost:6379`
- **PostgreSQL** on `localhost:5432` (`reachinbox_db`)
- **Elasticsearch** on `localhost:9200`

*(If running without Docker, simply start your local Redis and PostgreSQL services, and configure `DATABASE_URL` and `REDIS_HOST` in `backend/.env`)*

---

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Generate Prisma Client & push schema to database
npm run db:push

# Start backend server in watch mode
npm run dev
```

The backend starts at:
- **API Server**: [http://localhost:5000](http://localhost:5000)
- **Bull Board Queue Dashboard**: [http://localhost:5000/admin/queues](http://localhost:5000/admin/queues)

---

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The frontend will run at:
- **Dashboard**: [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Environment Variables

Create `backend/.env` (sample provided in `backend/.env.example`):

```ini
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database (PostgreSQL)
DATABASE_URL=postgresql://reachinbox:reachinbox123@localhost:5432/reachinbox_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret
JWT_SECRET=reachinbox-super-secret-jwt-key-change-in-prod

# Google OAuth (GCP Console Credentials)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Ethereal Email (Leave blank to auto-generate a fresh test account)
ETHEREAL_USER=
ETHEREAL_PASS=

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Slack Integration
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback

# Scheduler Concurrency & Throttling
WORKER_CONCURRENCY=3
MAX_EMAILS_PER_HOUR_PER_SENDER=50
MIN_DELAY_BETWEEN_SENDS_MS=2000
```

> **Note on Ethereal Email:** If `ETHEREAL_USER` and `ETHEREAL_PASS` are left blank, Nodemailer will automatically generate an on-the-fly Ethereal test account on first launch and print credentials and preview links in the server console!

---

## ⏱ How Scheduling & Persistence Work

### 1. Zero Cron Jobs (Hard Requirement)
The system **never uses cron**, `node-cron`, `agenda`, or OS `crontab`.
Instead, scheduling is completely event-driven via **BullMQ delayed jobs**:
```typescript
const delay = Math.max(0, scheduledTime - Date.now() + index * delayBetweenMs);

const job = await emailQueue.add(
  `email-${email.id}`,
  { emailId: email.id, sender, recipient, subject, body, userId },
  { delay, jobId: `email-${email.id}` }
);
```

### 2. Dual-Layer Restart Persistence
When the server restarts:
1. **Redis Persistence**: BullMQ delayed jobs are kept in Redis's sorted set (`zset`), scored by Unix timestamp. Redis is configured with `appendonly yes` (AOF), so pending delayed jobs survive server and container restarts.
2. **PostgreSQL Startup Reconciler (`jobRecovery.ts`)**:
   On backend boot, `reconcileScheduledEmails()` runs:
   - Queries PostgreSQL for all emails with status `SCHEDULED` or `RATE_LIMITED`.
   - Checks BullMQ to see if the corresponding job exists in Redis.
   - If missing (e.g., Redis was restarted or flushed), it recalculates the remaining delay:
     `delay = Math.max(0, scheduledAt.getTime() - Date.now())` and re-enqueues it with the original `jobId`.
   - **Emails are never restarted from Day 1, never lost, and never duplicated.**

### 3. Idempotency Check
Before executing any email send, the BullMQ worker checks PostgreSQL:
```typescript
const email = await prisma.email.findUnique({ where: { id: emailId } });
if (email.status === 'SENT') {
  console.log(`✅ Email ${emailId} already SENT, skipping (idempotent).`);
  return;
}
```
Status updates follow a strict finite state machine:
`SCHEDULED` ➔ `SENDING` ➔ `SENT` (or `FAILED` / `RATE_LIMITED`).

---

## 🚦 How Rate Limiting & Concurrency Work

### 1. Worker Concurrency
- Configured via `WORKER_CONCURRENCY` env variable (default: `3`).
- BullMQ worker spawns N concurrent job processors in parallel, completely thread-safe across asynchronous I/O.

### 2. Minimum Delay Between Sends (Throttling)
- Provider throttling (e.g., minimum 2 seconds between individual sends) is enforced at two levels:
  - **Worker Queue Limiter**: `limiter: { max: 1, duration: 2000 }` ensures the worker does not dispatch faster than 1 send per 2000ms.
  - **Schedule Staggering**: When scheduling multiple recipients in a batch, each subsequent recipient is delayed by `index * delayBetweenMs`.

### 3. Per-Sender Hourly Rate Limiting (Redis-Backed)
- Key format: `ratelimit:{sender}:{hourWindow}`, where `hourWindow = Math.floor(Date.now() / 3600000)`.
- Uses atomic Redis `INCR` + `EXPIRE 3600`.
- Because counters reside in Redis, rate limits are globally consistent across multiple worker processes or container instances.

### 4. Handling Rate Limit Exceeded
When a sender hits `MAX_EMAILS_PER_HOUR_PER_SENDER`:
1. **Job is NOT dropped or failed**.
2. Next hour window start time is computed: `retryAfterMs = (hourWindow + 1) * 3600000 - Date.now()`.
3. The job is rescheduled with BullMQ delay = `retryAfterMs`.
4. PostgreSQL status is updated to `RATE_LIMITED` with the updated target time.
5. If the user has connected Slack, a notification is immediately dispatched to their channel.

---

## 💬 Slack & Ethereal Integration

### 1. Real Slack OAuth & Webhook
- User clicks **"Connect Slack"** in the frontend header.
- Redirects to Slack OAuth: `https://slack.com/oauth/v2/authorize?scope=incoming-webhook`.
- On authorization, Slack redirects to `/api/slack/callback`.
- Backend exchanges the auth code with Slack API and stores the `incoming_webhook.url` in the user's PostgreSQL record.
- When any rate limit is hit, `sendSlackNotification()` posts an interactive Slack message card with sender details, current hourly volume, limit, and estimated resume time.
- If Slack is not connected, rate-limit hits proceed cleanly without crashing.

### 2. Fake SMTP via Ethereal Email
- Every email sent by the worker creates a real test SMTP message on Ethereal Email.
- The Ethereal message preview URL (`nodemailer.getTestMessageUrl(info)`) is saved in the `previewUrl` database column.
- The frontend **Sent Emails** table renders an interactive **"View Ethereal"** link for each sent email, opening the rendered HTML email in your browser!

---

## 📡 API Reference

### Authentication
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/auth/google` | Initiates real Google OAuth flow |
| `GET` | `/api/auth/google/callback` | Google OAuth callback; redirects to frontend with JWT |
| `GET` | `/api/auth/dev-login` | Quick one-click demo login for local review |
| `GET` | `/api/auth/me` | Returns current user profile |

### Emails (Authenticated via Bearer JWT)
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/emails/schedule` | Schedule batch emails with optional CSV/TXT file upload |
| `GET` | `/api/emails/scheduled` | List scheduled/queued emails |
| `GET` | `/api/emails/sent` | List sent & failed emails with preview URLs |
| `GET` | `/api/emails/search?q=:query` | Search emails via Elasticsearch (with Postgres fallback) |
| `GET` | `/api/emails/stats` | Returns scheduled, sent, and failed counts |

### Slack Integration (Authenticated via Bearer JWT)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/slack/connect` | Initiates Slack OAuth incoming-webhook authorization |
| `GET` | `/api/slack/callback` | Exchanges code with Slack and stores webhook URL |
| `GET` | `/api/slack/status` | Returns whether current user has connected Slack |

### Admin & Monitoring
| Route | Description |
|---|---|
| `/admin/queues` | Live Bull Board dashboard: inspect active, delayed, waiting, completed jobs |
| `/api/health` | Health check endpoint returning system timestamp |

---

## ⚖️ Assumptions, Shortcuts & Trade-offs

1. **Fake SMTP vs Production ESP**:
   - Used Ethereal Email per assignment instructions. In production, Ethereal would be swapped with AWS SES, SendGrid, or Resend with verified domain reputations.
2. **Single-Node Elasticsearch**:
   - For local development and testing, Elasticsearch runs in single-node mode with security disabled. In production, a clustered ES with TLS and index lifecycle policies (ILM) should be configured.
   - We implemented a transparent PostgreSQL fallback so search never breaks even if Elasticsearch is temporarily starting up.
3. **Google OAuth Reviewer Convenience**:
   - Added a **"Quick Demo Sign-In"** button alongside the standard **"Sign in with Google"** button. This ensures assignment reviewers can test the application instantly without needing to configure their own Google Cloud Console credentials first.
4. **Bull Board Access**:
   - In production, `/admin/queues` would be gated behind role-based admin authentication. For ease of demonstration, it is exposed on the backend port.

---

## 🎥 Demo Video & Submission

### Assignment Requirements Checklist:
- [x] Backend in TypeScript + Express.js
- [x] BullMQ + Redis persistent job scheduler (**Zero cron jobs**)
- [x] PostgreSQL database with Prisma ORM
- [x] Nodemailer with Ethereal Email fake SMTP & preview links
- [x] Elasticsearch indexing & multi-field search
- [x] Live BullMQ dashboard (Bull Board) at `/admin/queues`
- [x] Server restart persistence without losing or duplicating jobs
- [x] Idempotency checks before sending
- [x] Configurable worker concurrency
- [x] Throttling / delay between individual sends (default 2s)
- [x] Per-sender hourly rate limiting backed by Redis
- [x] Automatic job rescheduling to next hour window on rate limit
- [x] Real Slack OAuth connection + live rate-limit webhook notification
- [x] Real Google OAuth authentication + JWT sessions
- [x] React + TypeScript + Tailwind CSS frontend dashboard
- [x] Compose modal with CSV/TXT parsing and email count detection
- [x] Scheduled & Sent tables with loading, error, and empty states
- [x] Docker Compose file for Redis, Postgres, and Elasticsearch

### Submission Access:
Granted access to reviewers:
- `Mitrajit`
- `Yadav036`

---
*Developed with ❤️ for the ReachInbox Software Development Internship Assignment.*
