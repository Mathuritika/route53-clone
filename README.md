# AWS Route 53 Clone

A functional clone of the AWS Route 53 console: mocked sign-in, full CRUD for **hosted zones** and **DNS records**, all persisted in SQLite behind a FastAPI backend. It recreates the Route 53 look and workflows; it does not serve real DNS.

**Live demo:** https://route53-clone-alpha.vercel.app · **API docs:** https://route53-clone-api-hny5.onrender.com/docs
> The backend runs on Render's free tier and sleeps when idle, so the first request can take ~50 seconds.
**Demo login:** `demo` / `demo1234` (a second user `admin` / `admin1234` shows that data is per-user)

## Tech stack

|Layer|Choice|Why|
|-|-|-|
|Frontend|Next.js 14 (App Router) + TypeScript|Required stack|
|UI|[Cloudscape Design System](https://cloudscape.design)|AWS's own open-source design system, the one the AWS console uses, so tables, forms, modals and flashbars look and behave like Route 53|
|Backend|FastAPI + Pydantic|Required stack; automatic validation and OpenAPI docs at `/docs`|
|Database|SQLite via SQLAlchemy 2.0 ORM|Required stack; ORM keeps SQL safe and models readable|

## Features

* **Auth (mocked):** login, logout, session persistence. Login creates a random token stored in the `sessions` table; the browser keeps it in `localStorage` and sends `Authorization: Bearer <token>`. Refreshing the page keeps you signed in; expired or invalid tokens send you back to the login page.
* **Hosted zones:** list, search (name / description / ID), filter by type, server-side pagination with page-size preference, create (public or private with VPC), edit description, delete (with "type *delete* to confirm").
* **DNS records:** A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA. List, search (name or value), filter by type, paginate, create (Route 53 "Quick create"), edit, delete, multi-select bulk delete.
* **Route 53 experience:** AWS top bar, Route 53 side navigation, breadcrumbs, full-page tables, detail page with expandable "Hosted zone details" and tabs, success/error flashbars, confirmation modals.
* **Placeholders:** Dashboard, Health checks, Profiles, Traffic policies, Domains, Resolver ("Coming soon").
* **Bonus:** import BIND zone files, export zone as JSON or BIND, bulk delete, dark mode.

### Route 53 rules enforced by the backend

The backend is the source of truth; the UI only displays its error messages.

1. Every new zone automatically gets an **NS** record (4 fake `awsdns` name servers) and an **SOA** record at the apex. These default records cannot be deleted.
2. A zone can only be deleted when it holds nothing but the default NS and SOA records (Route 53's `HostedZoneNotEmpty`) → **409**.
3. One record set per **(name, type)** in a zone → duplicate gives **409**.
4. **CNAME** rules (RFC 1034): not allowed at the zone apex, only one value, and it cannot share its name with any other record type → 400 / 409.
5. Values are validated per type (IPv4, IPv6, `priority host` for MX, `priority weight port target` for SRV, `flags tag "value"` for CAA; TXT values are auto-quoted).
6. After creation only a zone's description can change, and only a record's TTL and values (same as Route 53).
7. Every query is scoped to the logged-in user; another user's zone ID returns 404.

## Local setup

**Requirements:** Python 3.10+, Node 18+.

```bash
# 1. Backend  (http://localhost:8000, docs at /docs)
cd backend
python -m venv .venv \&\& source .venv/bin/activate     # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Frontend (http://localhost:3000)   - in a second terminal
cd frontend
npm install
cp .env.example .env.local          # NEXT\_PUBLIC\_API\_URL=http://localhost:8000
npm run dev
```

On first start the backend creates `route53.db` and seeds demo data automatically. Delete the file to reset.

### Environment variables

|Where|Variable|Default|
|-|-|-|
|backend|`DATABASE\_URL`|`sqlite:///./route53.db`|
|backend|`CORS\_ORIGINS`|`http://localhost:3000` (comma-separated)|
|backend|`SESSION\_HOURS`|`24`|
|frontend|`NEXT\_PUBLIC\_API\_URL`|`http://localhost:8000`|

## Deployment
- **Backend → Render (Web Service):** root directory `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Env vars: `PYTHON_VERSION=3.11.9`, `CORS_ORIGINS=https://route53-clone-alpha.vercel.app,http://localhost:3000`.
- **Frontend → Vercel:** root directory `frontend`, env var `NEXT_PUBLIC_API_URL=https://route53-clone-api-hny5.onrender.com`. `frontend/vercel.json` pins the framework to Next.js.
- SQLite on a free host can reset on restart; the app re-seeds demo data automatically when the database is empty.

## Architecture

```
Browser (Next.js + Cloudscape)
   │  pages  ──► components ──► lib/api.ts (the only fetch; adds Bearer token)
   ▼
FastAPI
   routers/   HTTP only: parse request, call a service, return a schema
   services/  business rules and validation (raise domain errors, no HTTP code)
   models/    SQLAlchemy tables
   ▼
SQLite (route53.db)
```

Services raise `AppError` / `NotFoundError` / `ConflictError` / `AuthError` (`app/core/errors.py`); one handler in `main.py` turns them into `{"code", "message"}` JSON with 400/404/409/401. This keeps routers thin and services testable without HTTP.

### Folder structure

```
backend/app/
  main.py                 app, CORS, error handlers, routers, create tables + seed on startup
  core/config.py          settings from env vars
  core/database.py        engine (foreign keys ON for SQLite), SessionLocal, Base
  core/deps.py            get\_db, get\_current\_user (reads Bearer token)
  core/errors.py          domain exceptions
  models/                 user.py (users, sessions), hosted\_zone.py, record.py
  schemas/                Pydantic request/response models + generic Page\[T]
  services/auth\_service.py      login / logout / token lookup
  services/zone\_service.py      zone search, create (+ default NS/SOA), update, delete rule
  services/record\_service.py    record search, create/update with conflict rules, (bulk) delete
  services/validators.py        domain-name + per-type value validation (pure functions)
  services/bind\_service.py      JSON/BIND export, BIND import
  routers/                auth.py, hosted\_zones.py, records.py
  seed/seed.py            deterministic, idempotent demo data

frontend/src/
  app/                    App Router pages (login, hostedzones, \[id], create/edit, placeholders)
  components/layout/      ConsoleLayout (shell + auth guard), TopNav, SideNav
  components/zones/       ZoneForm (shared create/edit)
  components/records/     RecordForm (shared create/edit), RecordsTable, ImportModal
  components/ui/          DeleteModal, ComingSoon, PageState
  context/                AuthContext (user + token), NotificationContext (flashbar)
  hooks/                  usePagedList (debounced search + filter + pagination), useZone, useFollow
  lib/                    api.ts, types.ts, recordTypes.ts, download.ts
```

## Database schema

```
users           id PK · username UNIQUE · password\_hash · account\_id · created\_at
sessions        token PK · user\_id FK→users (CASCADE) · created\_at · expires\_at
hosted\_zones    id PK (e.g. Z0ABC…) · user\_id FK→users (CASCADE) · name · zone\_type (public|private)
                · comment · vpc\_region · vpc\_id · created\_at
                UNIQUE(user\_id, name)
dns\_records     id PK · zone\_id FK→hosted\_zones (CASCADE, indexed) · name · type · ttl
                · values\_json · routing\_policy · created\_at · updated\_at
                UNIQUE(zone\_id, name, type)
```

Relationships: a user has many sessions and many hosted zones; a hosted zone has many records. Deleting a zone cascades to its records.

**Design decisions**

* **Record set = one row.** Route 53 groups values by (name, type), e.g. one A record `www` with two IPs. So a row stores the list of values as JSON, and `UNIQUE(zone\_id, name, type)` enforces "one record set per name and type" in the database itself, not just in code.
* **Names stored fully qualified with a trailing dot** (`www.example.com.`), exactly as Route 53 displays them. This makes uniqueness and CNAME conflict checks simple string comparisons.
* **Record count is computed** with `COUNT()` in the list query, not stored, so it can never get out of sync.
* **Zone ID is a string** in Route 53 format instead of an integer, because that is what users see and copy.
* **Sessions in the DB** (not a JWT) so logout really invalidates the token.
* `PRAGMA foreign\_keys=ON` is set on every connection because SQLite ignores foreign keys otherwise.

## API overview

All endpoints except login need `Authorization: Bearer <token>`. Errors look like `{"code": "Conflict", "message": "..."}`. Interactive docs: `/docs`.

|Method|Path|Description|
|-|-|-|
|POST|`/api/auth/login`|`{username, password}` → `{token, user}`|
|POST|`/api/auth/logout`|Invalidate the current session|
|GET|`/api/auth/me`|Current user (used to restore a session on refresh)|
|GET|`/api/hosted-zones?search=\&type=\&page=\&page\_size=`|Paginated zones `{items, total, page, page\_size}`|
|POST|`/api/hosted-zones`|Create zone (+ default NS/SOA)|
|GET|`/api/hosted-zones/{id}`|Zone details incl. name servers and record count|
|PATCH|`/api/hosted-zones/{id}`|Update description|
|DELETE|`/api/hosted-zones/{id}`|Delete (409 if it still has non-default records)|
|GET|`/api/hosted-zones/{id}/export?format=json\|bind`|Export zone|
|POST|`/api/hosted-zones/{id}/import`|`{zone\_file}` → `{created, skipped\[]}`|
|GET|`/api/hosted-zones/{id}/records?search=\&type=\&page=\&page\_size=`|Paginated records|
|POST|`/api/hosted-zones/{id}/records`|`{name, type, ttl, values\[]}`|
|GET|`/api/hosted-zones/{id}/records/{rid}`|One record|
|PUT|`/api/hosted-zones/{id}/records/{rid}`|`{ttl, values\[]}`|
|DELETE|`/api/hosted-zones/{id}/records/{rid}`|Delete one record|
|POST|`/api/hosted-zones/{id}/records/bulk-delete`|`{ids\[]}`, all-or-nothing|

## Assumptions and simplifications

* Authentication, IAM, accounts and billing are mocked. Passwords are SHA-256 hashed (a real system would use bcrypt/argon2).
* Only **Simple routing** is supported; alias records, weighted/latency/geo routing, health checks, DNSSEC and tags are shown as disabled or "Coming soon".
* Zone names are unique per user (real Route 53 allows duplicates, told apart by description).
* The BIND importer handles common syntax (`$ORIGIN`, `$TTL`, `@`, relative names, blank owner lines, `( … )` multi-line records); `;` inside quoted TXT values is not supported.
* Search and pagination happen on the server so the UI stays fast for large zones.

