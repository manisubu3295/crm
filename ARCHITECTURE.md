# Lead Generation & Follow-Up CRM — System Architecture

**Prepared by:** Aadhirai Innovations  
**Architect:** Senior Full-Stack / Microservice Architect (35 yrs)  
**Version:** 1.0  
**Date:** 2026-04-10  
**Reference Design:** Aadhirai Pharma OS (Medora+)

---

## 1. SYSTEM OVERVIEW

A multi-tenant, enterprise-grade CRM for training institutions. Captures leads from
Meta Ads, websites, walk-ins, and phone calls. Automates follow-ups via WhatsApp,
Email, SMS, and IVR. Tracks counsellor performance and provides real-time pipeline
visibility.

---

## 2. HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Web App         │  │  Mobile Browser   │  │  Admin Portal            │   │
│  │  (React 19/Vite) │  │  (PWA)           │  │  (React 19/Vite)        │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────┬─────────────┘  │
└───────────┼──────────────────────┼──────────────────────────┼───────────────┘
            │  HTTPS / WSS          │                          │
┌───────────┼──────────────────────┼──────────────────────────┼───────────────┐
│           │      API GATEWAY / REVERSE PROXY (Nginx)         │               │
│           └──────────────────────┴──────────────────────────┘               │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                         APPLICATION LAYER (Express.js)                       │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Lead        │  │  Follow-Up   │  │  Automation  │  │  Communication  │ │
│  │  Service     │  │  Service     │  │  Engine      │  │  Gateway        │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Campaign    │  │  Reporting   │  │  Auth /      │  │  Webhook        │ │
│  │  Service     │  │  Service     │  │  Tenant Svc  │  │  Receiver       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
        ┌─────────────┬───────────────┼─────────────────┬──────────────┐
        │             │               │                  │              │
┌───────▼──────┐ ┌────▼──────┐ ┌─────▼──────┐  ┌──────▼─────┐ ┌──────▼──────┐
│  PostgreSQL  │ │  Redis     │ │  BullMQ    │  │  Socket.io │ │  External   │
│  (Per-Tenant │ │  Cache +   │ │  Job Queue │  │  Real-time │ │  APIs       │
│   DB Pool)   │ │  Sessions  │ │  Scheduler │  │  Server    │ │  (WA/Email/ │
└──────────────┘ └───────────┘ └────────────┘  └────────────┘ │  SMS/IVR)  │
                                                                └────────────┘
```

---

## 3. TECH STACK

### Frontend
| Layer            | Technology                         |
|------------------|------------------------------------|
| Framework        | React 19 + Vite 7                  |
| Routing          | Wouter (lightweight)               |
| UI Components    | Radix UI + Tailwind CSS v4         |
| Server State     | TanStack React Query v5            |
| Forms            | React Hook Form + Zod              |
| Real-time        | Socket.io-client                   |
| Charts           | Recharts                           |
| Export           | ExcelJS + PDFMake                  |
| Icons            | Lucide React                       |
| Notifications    | Sonner (toast)                     |
| Date Handling    | date-fns + date-fns-tz             |

### Backend
| Layer            | Technology                         |
|------------------|------------------------------------|
| Server           | Express.js 4.x + TypeScript 5.6    |
| ORM              | Drizzle ORM 0.39                   |
| Database         | PostgreSQL 16 (per-tenant)         |
| Cache            | Redis 7 (ioredis)                  |
| Job Queue        | BullMQ (Redis-backed)              |
| Real-time        | Socket.io 4                        |
| Auth             | JWT + Passport.js + bcryptjs       |
| Validation       | Zod (shared with frontend)         |
| Logging          | Pino                               |
| Migrations       | Umzug + SQL files                  |
| Security         | Helmet + CORS + express-rate-limit |
| PDF Reports      | Handlebars + Puppeteer             |
| Excel Reports    | ExcelJS                            |
| HTTP Client      | axios (for external API calls)     |

### Infrastructure
| Layer            | Technology                         |
|------------------|------------------------------------|
| Containerization | Docker + docker-compose            |
| Reverse Proxy    | Nginx                              |
| CI/CD            | GitHub Actions                     |
| Monitoring       | Pino + health check endpoints      |

---

## 4. MONOREPO DIRECTORY STRUCTURE

```
crm/
├── client/                          # React 19 Frontend
│   └── src/
│       ├── components/
│       │   ├── ui/                  # Radix + Tailwind base components
│       │   ├── layout/              # AppShell, Sidebar, Header
│       │   ├── lead/                # LeadCard, LeadKanban, LeadForm
│       │   ├── followup/            # TaskCard, ReminderBadge
│       │   ├── communication/       # MessageThread, ChannelBadge
│       │   └── dashboard/           # FunnelChart, ConversionWidget
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Leads.tsx            # Kanban + List view
│       │   ├── LeadDetail.tsx       # Timeline, tasks, comms
│       │   ├── FollowUps.tsx
│       │   ├── Campaigns.tsx
│       │   ├── Reports.tsx
│       │   ├── Settings.tsx
│       │   └── admin/
│       │       ├── Users.tsx
│       │       ├── Courses.tsx
│       │       └── Automation.tsx   # Automation rule builder
│       ├── contexts/
│       │   ├── AuthContext.tsx
│       │   └── TenantContext.tsx
│       ├── hooks/
│       │   ├── useLeads.ts
│       │   ├── useFollowUps.ts
│       │   ├── useSocket.ts         # Real-time socket hook
│       │   └── useAutoLogout.ts
│       ├── lib/
│       │   ├── auth.tsx
│       │   ├── queryClient.ts
│       │   ├── socket.ts            # Socket.io client setup
│       │   └── exportUtils.ts
│       └── App.tsx
│
├── server/
│   ├── index.ts                     # Entry point, mode detection
│   │
│   └── multitenant/                 # PRIMARY RUNTIME
│       ├── server.ts                # Express app factory
│       ├── start.ts                 # Server startup + Socket.io attach
│       ├── config.ts
│       ├── env.ts                   # Zod env validation
│       ├── types.ts
│       │
│       ├── auth/
│       │   ├── jwt.ts
│       │   └── tenantGuard.ts
│       │
│       ├── middleware/
│       │   ├── security.ts
│       │   ├── requestContext.ts    # AsyncLocalStorage tenant context
│       │   └── errorHandler.ts
│       │
│       ├── routes/                  # REST API endpoints
│       │   ├── auth.ts              # /api/auth/*
│       │   ├── leads.ts             # /api/leads/*
│       │   ├── followups.ts         # /api/followups/*
│       │   ├── communications.ts    # /api/comms/*
│       │   ├── campaigns.ts         # /api/campaigns/*
│       │   ├── automation.ts        # /api/automation/*
│       │   ├── reports.ts           # /api/reports/*
│       │   ├── webhooks.ts          # /api/webhooks/meta, /website
│       │   ├── courses.ts           # /api/courses/*
│       │   └── admin.ts             # /api/admin/*
│       │
│       ├── services/                # Business logic
│       │   ├── leadService.ts
│       │   ├── leadScoringService.ts
│       │   ├── duplicateDetectionService.ts
│       │   ├── followUpService.ts
│       │   ├── slaService.ts
│       │   ├── automationService.ts
│       │   ├── communicationService.ts
│       │   ├── whatsappService.ts
│       │   ├── emailService.ts
│       │   ├── smsService.ts
│       │   ├── ivrService.ts
│       │   ├── campaignService.ts
│       │   ├── reportService.ts
│       │   ├── importService.ts     # Excel import
│       │   └── reEngagementService.ts
│       │
│       ├── queues/                  # BullMQ job definitions
│       │   ├── index.ts             # Queue registry
│       │   ├── automationQueue.ts   # Trigger processing
│       │   ├── communicationQueue.ts # Message dispatch
│       │   ├── followUpQueue.ts     # Reminder scheduling
│       │   ├── slaQueue.ts          # SLA breach checks
│       │   └── reEngagementQueue.ts # Dormant lead drip
│       │
│       ├── workers/                 # BullMQ workers
│       │   ├── automationWorker.ts
│       │   ├── communicationWorker.ts
│       │   ├── followUpWorker.ts
│       │   ├── slaWorker.ts
│       │   └── reEngagementWorker.ts
│       │
│       ├── realtime/
│       │   ├── socketServer.ts      # Socket.io server setup
│       │   └── events.ts            # Event name constants
│       │
│       ├── migrations/              # SQL migration files
│       │   ├── 001_core.sql         # users, tenants, settings
│       │   ├── 002_leads.sql        # leads, lead_stages
│       │   ├── 003_followups.sql    # tasks, reminders, sla
│       │   ├── 004_communications.sql
│       │   ├── 005_campaigns.sql
│       │   ├── 006_automation.sql
│       │   └── 007_reports.sql
│       │
│       ├── tenant/
│       │   ├── registry.ts
│       │   ├── dbPool.ts
│       │   └── ensureReady.ts
│       │
│       └── seed/
│           └── seedMandatory.ts     # Lead stages, roles, default templates
│
├── shared/
│   ├── schema.ts                    # Drizzle ORM schema (all tables)
│   └── types.ts                     # Shared Zod validators + TS types
│
├── script/
│   ├── build-multitenant.ts
│   └── seed-dev.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## 5. DATABASE SCHEMA (Drizzle ORM / PostgreSQL)

### 5.1 Core & Auth

```sql
-- users
id uuid PK DEFAULT gen_random_uuid()
username varchar(50) UNIQUE NOT NULL
password_hash varchar NOT NULL
full_name varchar(100) NOT NULL
email varchar(100)
phone varchar(20)
role  ENUM('admin', 'manager', 'counsellor', 'viewer')
is_active boolean DEFAULT true
created_at timestamptz DEFAULT now()

-- app_settings (per-tenant config)
id serial PK
key varchar(100) UNIQUE NOT NULL
value text NOT NULL
updated_at timestamptz DEFAULT now()
```

### 5.2 Lead Domain

```sql
-- courses
id uuid PK
name varchar(200) NOT NULL
description text
duration varchar(50)        -- "3 months", "6 months"
fee numeric(10,2)
is_active boolean DEFAULT true

-- leads
id uuid PK DEFAULT gen_random_uuid()
lead_no varchar(30) UNIQUE   -- CRM-2026-0001
full_name varchar(200) NOT NULL
email varchar(150)
phone varchar(20) NOT NULL
alternate_phone varchar(20)
city varchar(100)
qualification varchar(100)
course_id uuid FK → courses
source ENUM('meta_ads','website','manual','excel_import','walk_in','phone','referral')
campaign_id uuid FK → campaigns (nullable)
ad_id varchar(200)           -- Meta ad_id for attribution
form_id varchar(200)         -- Meta form_id
stage ENUM('new','contacted','qualified','demo','interested','payment','admitted','lost')
sub_stage varchar(100)       -- freeform sub-stage label
lead_score integer DEFAULT 0 CHECK (0-100)
assigned_to uuid FK → users (counsellor)
is_duplicate boolean DEFAULT false
duplicate_of uuid FK → leads (nullable)
lost_reason varchar(300)
objection_notes text
re_engagement_eligible boolean DEFAULT true
last_contacted_at timestamptz
admitted_at timestamptz
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()

-- lead_stage_history  (immutable audit log)
id uuid PK
lead_id uuid FK → leads
from_stage varchar(50)
to_stage varchar(50)
changed_by uuid FK → users
note text
changed_at timestamptz DEFAULT now()

-- lead_custom_fields  (flexible per-tenant metadata)
id uuid PK
lead_id uuid FK → leads
field_key varchar(100)
field_value text

-- opportunities  (multi-opportunity per lead)
id uuid PK
lead_id uuid FK → leads
course_id uuid FK → courses
stage varchar(50)
expected_fee numeric(10,2)
probability integer           -- 0-100%
created_at timestamptz DEFAULT now()
```

### 5.3 Follow-Up & Task Domain

```sql
-- tasks
id uuid PK DEFAULT gen_random_uuid()
lead_id uuid FK → leads
opportunity_id uuid FK → opportunities (nullable)
assigned_to uuid FK → users
task_type ENUM('call','whatsapp','email','sms','meeting','demo','follow_up','other')
title varchar(300) NOT NULL
description text
status ENUM('pending','in_progress','done','overdue','cancelled')
priority ENUM('low','medium','high','urgent')
due_at timestamptz NOT NULL
completed_at timestamptz
reminder_at timestamptz
outcome text
created_by uuid FK → users
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()

-- sla_policies  (per-stage SLA config)
id uuid PK
stage varchar(50) NOT NULL
max_response_hours integer NOT NULL   -- breach threshold
escalate_to uuid FK → users           -- manager to notify
is_active boolean DEFAULT true

-- sla_tracking
id uuid PK
lead_id uuid FK → leads
task_id uuid FK → tasks (nullable)
policy_id uuid FK → sla_policies
breached boolean DEFAULT false
breached_at timestamptz
escalation_sent boolean DEFAULT false
created_at timestamptz DEFAULT now()
```

### 5.4 Communication Domain

```sql
-- communication_logs
id uuid PK DEFAULT gen_random_uuid()
lead_id uuid FK → leads
task_id uuid FK → tasks (nullable)
channel ENUM('whatsapp','email','sms','ivr','manual_call')
direction ENUM('outbound','inbound')
status ENUM('queued','sent','delivered','read','failed','replied')
template_id uuid FK → message_templates (nullable)
subject varchar(500)          -- email subject
body text NOT NULL
sent_by uuid FK → users (nullable — null if automated)
sent_at timestamptz
delivered_at timestamptz
read_at timestamptz
external_message_id varchar(300)  -- WhatsApp wamid, email msg-id
error_message text
created_at timestamptz DEFAULT now()

-- message_templates
id uuid PK DEFAULT gen_random_uuid()
name varchar(200) NOT NULL
channel ENUM('whatsapp','email','sms','ivr')
trigger_event varchar(100)    -- 'new_lead', 'demo_scheduled', etc.
subject varchar(500)          -- email
body text NOT NULL            -- Handlebars template
variables jsonb               -- expected variable keys
wa_template_name varchar(200) -- WhatsApp approved template name
is_active boolean DEFAULT true
created_at timestamptz DEFAULT now()
```

### 5.5 Automation Domain

```sql
-- automation_rules
id uuid PK DEFAULT gen_random_uuid()
name varchar(300) NOT NULL
description text
trigger_event varchar(100) NOT NULL  -- 'lead_created','stage_changed','no_response_24h', etc.
trigger_conditions jsonb             -- { "stage": "new", "source": "meta_ads" }
actions jsonb NOT NULL               -- array of action objects
  -- [{ type: 'send_message', channel: 'whatsapp', template_id: '...' },
  --  { type: 'assign_task', task_type: 'call', due_hours: 2 },
  --  { type: 'escalate', to_user_id: '...' },
  --  { type: 'change_stage', to_stage: '...' }]
delay_minutes integer DEFAULT 0
is_active boolean DEFAULT true
execution_count integer DEFAULT 0
created_by uuid FK → users
created_at timestamptz DEFAULT now()

-- automation_execution_log
id uuid PK
rule_id uuid FK → automation_rules
lead_id uuid FK → leads
triggered_at timestamptz DEFAULT now()
actions_taken jsonb
status ENUM('success','failed','skipped')
error_message text
```

### 5.6 Campaign Domain

```sql
-- campaigns
id uuid PK DEFAULT gen_random_uuid()
name varchar(300) NOT NULL
source ENUM('meta_ads','google_ads','email','sms','referral','organic','other')
meta_campaign_id varchar(200)
meta_adset_id varchar(200)
start_date date
end_date date
budget numeric(12,2)
is_active boolean DEFAULT true
created_at timestamptz DEFAULT now()

-- campaign_stats  (materialized daily)
id uuid PK
campaign_id uuid FK → campaigns
date date NOT NULL
leads_count integer DEFAULT 0
contacted_count integer DEFAULT 0
admitted_count integer DEFAULT 0
spend numeric(12,2)
cost_per_lead numeric(10,2)
cost_per_admission numeric(10,2)
updated_at timestamptz DEFAULT now()
```

### 5.7 Re-engagement Domain

```sql
-- reengagement_campaigns
id uuid PK
name varchar(300) NOT NULL
description text
target_stage varchar(50)          -- leads in this stage
dormant_days integer NOT NULL     -- inactive for N days
channel ENUM('whatsapp','email','sms')
template_id uuid FK → message_templates
max_attempts integer DEFAULT 3
is_active boolean DEFAULT true
created_at timestamptz DEFAULT now()

-- reengagement_log
id uuid PK
campaign_id uuid FK → reengagement_campaigns
lead_id uuid FK → leads
attempt_number integer
sent_at timestamptz
response_received boolean DEFAULT false
```

---

## 6. API DESIGN

### Base Pattern
```
All API calls require:
  Header: Authorization: Bearer <jwt_token>
  Header: X-Tenant: <tenantId>
  Content-Type: application/json
```

### Endpoint Map

```
AUTH
  POST   /api/auth/login
  GET    /api/auth/me
  POST   /api/auth/logout

LEADS
  GET    /api/leads                     ?stage=&assigned_to=&source=&page=&limit=
  POST   /api/leads                     Create lead
  GET    /api/leads/:id                 Lead detail + history + tasks + comms
  PATCH  /api/leads/:id                 Update lead fields
  PATCH  /api/leads/:id/stage           Change pipeline stage
  PATCH  /api/leads/:id/assign          Reassign counsellor
  DELETE /api/leads/:id                 Soft-delete
  POST   /api/leads/import              Excel bulk import (multipart)
  POST   /api/leads/:id/merge           Merge duplicate

FOLLOW-UPS / TASKS
  GET    /api/tasks                     ?assigned_to=&status=&due_today=true
  POST   /api/tasks                     Create task
  PATCH  /api/tasks/:id                 Update (status, outcome)
  DELETE /api/tasks/:id

COMMUNICATIONS
  GET    /api/comms/:leadId             Full communication timeline
  POST   /api/comms/send                Send manual message (any channel)
  GET    /api/comms/templates           List message templates
  POST   /api/comms/templates           Create template
  PATCH  /api/comms/templates/:id

AUTOMATION
  GET    /api/automation/rules
  POST   /api/automation/rules
  PATCH  /api/automation/rules/:id
  DELETE /api/automation/rules/:id
  GET    /api/automation/logs           Execution history

CAMPAIGNS
  GET    /api/campaigns
  POST   /api/campaigns
  PATCH  /api/campaigns/:id
  GET    /api/campaigns/:id/stats       ROI metrics

REPORTS
  GET    /api/reports/funnel            Lead stage funnel
  GET    /api/reports/counsellor        Per-counsellor KPIs
  GET    /api/reports/campaign-roi      Campaign attribution
  GET    /api/reports/conversion        Daily/weekly/monthly conversion
  POST   /api/reports/export            PDF / Excel download

WEBHOOKS (no auth — HMAC signature verified)
  POST   /api/webhooks/meta             Meta Lead Ads
  POST   /api/webhooks/website          Website form submissions
  POST   /api/webhooks/whatsapp         WhatsApp inbound messages

ADMIN
  GET    /api/admin/users
  POST   /api/admin/users
  PATCH  /api/admin/users/:id
  GET    /api/admin/courses
  POST   /api/admin/courses
  GET    /api/admin/sla-policies
  POST   /api/admin/sla-policies
```

### Response Format
```typescript
// Success
{ ok: true, data: T, meta?: { total, page, limit } }

// Error
{ ok: false, code: string, message: string, details?: string }

// Auth
{ ok: true, token: string, tenantId: string, user: UserProfile }
```

---

## 7. AUTOMATION ENGINE DESIGN

The automation engine uses **BullMQ** (Redis-backed job queue) with **event-driven triggers**.

### Flow
```
Lead Event Occurs
      │
      ▼
automationService.processEvent(tenantId, event, leadId)
      │
      ├── Load active rules matching trigger_event
      ├── Evaluate trigger_conditions (jsonb match)
      ├── Apply delay_minutes → enqueue job
      │
      ▼
automationQueue (BullMQ)
      │
      ▼
automationWorker processes each action:
  ├── type: 'send_message'   → enqueue to communicationQueue
  ├── type: 'assign_task'    → create task in DB
  ├── type: 'escalate'       → send notification + create escalation task
  ├── type: 'change_stage'   → update lead stage
  └── type: 're_assign'      → reassign counsellor
```

### Trigger Events
```typescript
type TriggerEvent =
  | 'lead_created'
  | 'lead_stage_changed'
  | 'lead_assigned'
  | 'no_response_24h'        // CRON: check every hour
  | 'no_response_48h'
  | 'demo_scheduled'
  | 'demo_completed'
  | 'payment_link_sent'
  | 'payment_pending_24h'
  | 'task_overdue'
  | 'sla_breach'
  | 'lead_re_entered_pipeline';
```

### Queue Architecture
```
Redis
  ├── bull:automation    → automation rule execution
  ├── bull:communication → channel dispatch (WA / Email / SMS / IVR)
  ├── bull:followup      → scheduled reminders (delayed jobs)
  ├── bull:sla           → CRON: SLA breach scan every 15 min
  └── bull:reengagement  → CRON: dormant lead scan daily 9am
```

---

## 8. COMMUNICATION GATEWAY

### WhatsApp (Meta Cloud API)
```
POST /api/webhooks/whatsapp   ← inbound messages
communicationService.send()
  └── whatsappService.sendTemplate(phone, waTemplateName, variables)
        └── axios.POST https://graph.facebook.com/v17.0/{phone-id}/messages
```

### Email (SMTP / SendGrid)
```
emailService.send(to, subject, htmlBody)
  └── nodemailer transporter (SMTP or SendGrid API)
  └── Track opens via pixel (optional)
```

### SMS (Msg91)
```
smsService.send(phone, message)
  └── Msg91 REST API (transactional + OTP)
  └── Inbound delivery reports via webhook
```

### IVR (Exotel)
```
ivrService.initiateCall(phone, appId)
  └── Exotel REST API → triggers outbound call
  └── Callback webhook updates communication_log
  └── DTMF response captured via Exotel passthru
```

### Channel Abstraction
```typescript
interface IChannel {
  send(payload: MessagePayload): Promise<SendResult>
  getDeliveryStatus(externalId: string): Promise<DeliveryStatus>
}
```

---

## 9. LEAD SCORING ENGINE

```
Score = Σ(weighted signals)

Signals:
  Source weight:      Meta Ads=30, Walk-in=25, Referral=25, Website=20, Manual=10
  Response speed:     <1hr=20, <4hr=15, <24hr=10, >24hr=0
  Engagement:         Replied to WA=15, Opened email=5, Attended demo=25
  Profile completeness: email+phone+city=10
  Stage progression:  Each stage advance +5 (max 20)
  Recency:            Last contact <3 days=10, <7 days=5, >14 days=0

Range: 0-100
  0-30  → Cold
  31-60 → Warm
  61-80 → Hot
  81-100 → Very Hot
```

---

## 10. DUPLICATE DETECTION

```
On lead create (phone or email match):
  1. Exact phone match → flag as duplicate, link duplicate_of
  2. Exact email match → same as above
  3. Fuzzy name + city match (pg_trgm similarity > 0.8) → flag for review
  
  duplicateDetectionService.check(leadData)
    └── returns { isDuplicate, matchedLeadId, confidence }
  
  POST /api/leads/:id/merge  → merge interaction history to master lead
```

---

## 11. MULTI-TENANCY (Same as Pharma OS)

- **Isolation Level:** Per-tenant PostgreSQL database
- **Tenant Registry:** JSON file (`tenants.json`) + `/api/tenants` API
- **Request Context:** `X-Tenant` header + JWT claim validation
- **Connection Pooling:** `Map<tenantId, Pool>` with `pg-pool`
- **Migrations:** Umzug + advisory locks (per-tenant, atomic)
- **Redis Namespacing:** All Bull queues prefixed `{tenantId}:`
- **Socket.io Rooms:** Each tenant gets isolated room namespace

---

## 12. AUTHENTICATION & RBAC

### Roles & Permissions
```
admin       → Full access (all features, all leads)
manager     → All leads in team, reports, automation config
counsellor  → Own leads, tasks, send messages
viewer      → Read-only dashboards

JWT payload:
{
  sub: userId,
  tenantId: string,
  role: 'admin' | 'manager' | 'counsellor' | 'viewer',
  permissions: string[],   // fine-grained permission array
  exp: number              // 12hr expiry
}
```

### Middleware Stack (per request)
```
Request
  → security middleware (helmet, cors, rate-limit)
  → tenantFromHeader (validate X-Tenant)
  → authAndTenantGuard (verify JWT, match tenantId)
  → requireRole('manager') (optional role check)
  → route handler
```

---

## 13. REAL-TIME (Socket.io)

Events pushed to connected clients:
```typescript
// Lead events
'lead:created'         → { lead }        // counsellor's own leads
'lead:stage_changed'   → { leadId, to }
'lead:assigned'        → { leadId, to }

// Task events
'task:created'         → { task }
'task:overdue'         → { taskId }

// Communication events
'message:delivered'    → { leadId, messageId }
'message:replied'      → { leadId, messageId }

// System events
'notification'         → { type, message, severity }
'sla:breached'         → { leadId, taskId }
```

Rooms:
- `tenant:{tenantId}` — all users of the tenant
- `user:{userId}` — user-specific events

---

## 14. REPORTING & DASHBOARDS

### Dashboard Widgets
```
1. Lead Funnel         → stage-wise count + conversion %
2. Today's Tasks       → due today, overdue count
3. Channel Performance → leads by source pie chart
4. Counsellor Board    → calls made, stages moved, admissions
5. Campaign ROI        → spend vs admissions bar chart
6. Weekly Trend        → leads captured vs admitted (line chart)
7. Response Time SLA   → % within SLA by counsellor
```

### Report Exports (Puppeteer PDF + ExcelJS)
```
/api/reports/export?type=funnel&format=pdf&from=2026-01-01&to=2026-03-31
/api/reports/export?type=counsellor&format=excel
```

---

## 15. WEBHOOK SECURITY (Meta Ads)

```
Meta verifies webhook via:
  GET /api/webhooks/meta?hub.verify_token=<token>&hub.challenge=<n>
  → verify hub.verify_token === env.META_VERIFY_TOKEN
  → return hub.challenge

Inbound lead payload:
  POST /api/webhooks/meta
  → verify X-Hub-Signature-256 HMAC (env.META_APP_SECRET)
  → extract lead fields from leadgen_id
  → call Meta Graph API to fetch full form data
  → leadService.createFromMeta(tenantId, payload)
  → enqueue automation trigger: 'lead_created'
```

---

## 16. ENVIRONMENT VARIABLES

```env
# Server
NODE_ENV=production
PORT=3000
MULTITENANT_RUNTIME=true

# Multi-tenancy
TENANT_REGISTRY_PATH=/etc/crm/tenants.json
TENANT_DB_POOL_MAX=10
TENANT_DB_IDLE_MS=30000

# Security
JWT_SECRET=<min-32-chars>
TENANT_ADMIN_KEY=<secret>
CORS_ORIGINS=https://crm.aadhirai.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200

# Redis (BullMQ + Cache)
REDIS_URL=redis://localhost:6379

# Meta Ads
META_APP_SECRET=<app-secret>
META_VERIFY_TOKEN=<custom-verify-token>
META_ACCESS_TOKEN=<page-access-token>
META_PHONE_NUMBER_ID=<wa-phone-number-id>

# WhatsApp
WHATSAPP_API_URL=https://graph.facebook.com/v17.0

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
EMAIL_FROM=noreply@yourinstitution.com

# SMS
SMS_PROVIDER=msg91            # msg91 | twilio | gupshup
SMS_API_KEY=<key>
SMS_SENDER_ID=TRACRM

# IVR
IVR_PROVIDER=exotel           # exotel | twilio
IVR_API_KEY=<key>

# Reports
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
REPORT_TMP_DIR=/var/tmp/crm-reports

# Logging
LOG_LEVEL=info
```

---

## 17. DOCKER SETUP

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - /etc/crm/tenants.json:/etc/crm/tenants.json:ro

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: crm
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm"]
      interval: 5s
      retries: 20

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 10

volumes:
  pgdata:
  redisdata:
```

---

## 18. MIGRATION PLAN (8 Migrations)

```
001_core.sql           → users, app_settings, report_templates
002_leads.sql          → leads, courses, lead_stage_history,
                          lead_custom_fields, opportunities
003_followups.sql      → tasks, sla_policies, sla_tracking
004_communications.sql → communication_logs, message_templates
005_campaigns.sql      → campaigns, campaign_stats
006_automation.sql     → automation_rules, automation_execution_log
007_reengagement.sql   → reengagement_campaigns, reengagement_log
008_indexes.sql        → All performance indexes
                          (leads.phone, leads.email, leads.stage,
                           leads.assigned_to, tasks.due_at,
                           communication_logs.lead_id,
                           pg_trgm index on leads.full_name)
```

---

## 19. PHASED DELIVERY PLAN

### Phase 1 — Core CRM (Weeks 1-4)
- Multi-tenant setup, auth, RBAC
- Lead CRUD + pipeline stages
- Manual task creation + follow-up
- Basic dashboard

### Phase 2 — Integrations (Weeks 5-8)
- Meta Ads webhook
- WhatsApp (outbound templates)
- Email + SMS
- Excel import
- Website webhook

### Phase 3 — Automation (Weeks 9-12)
- BullMQ queues + workers
- Automation rule builder (UI + backend)
- SLA tracking + escalation
- Lead scoring engine

### Phase 4 — Analytics & Advanced (Weeks 13-16)
- Campaign attribution
- Counsellor performance reports
- Re-engagement engine
- Duplicate detection + merge
- PDF/Excel exports
- IVR integration

---

## 20. KEY ARCHITECTURAL DECISIONS

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-tenancy | Per-DB isolation | Data security, client trust |
| Job Queue | BullMQ + Redis | Reliable, retry-able async jobs; supports delayed/cron |
| Real-time | Socket.io | Works behind Nginx, room-based isolation |
| Automation | Rule engine (JSON) | No-code rule builder in UI; extensible without deploy |
| ORM | Drizzle ORM | Type-safe, SQL-first, lightweight (same as Pharma OS) |
| Frontend state | TanStack Query v5 | Server state + optimistic updates + background refetch |
| Communication | Abstracted `IChannel` | Swap providers without changing business logic |
| PDF reports | Handlebars + Puppeteer | Template stored in DB; runtime rendering; same as Pharma OS |
| Duplicate check | pg_trgm extension | In-DB fuzzy matching, no external search engine needed |
| Lead scoring | In-process (service) | Simple rule-based, fast; can evolve to ML later |
```

---

*This architecture directly mirrors the Aadhirai Pharma OS patterns:  
same monorepo layout, same multi-tenant runtime, same Drizzle+Umzug migration system,  
same Docker setup — extended with BullMQ, Redis, Socket.io, and external communication APIs  
required by the CRM domain.*
