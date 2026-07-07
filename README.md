# 🔥 BunIgniter

**CodeIgniter 3-Style Full Stack MVC Framework for Bun**

A full-stack MVC web framework built on Bun + Bun.serve + Bun SQL + a custom template engine.
It combines the familiar MVC patterns of CodeIgniter 3 with AdonisJS Ace-style CLI scaffolding.

---

## 🛠 Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | [Bun](https://bun.sh) | Latest |
| HTTP Server | [Bun.serve](https://bun.sh/docs/runtime/http) | Built-in (SIMD accelerated routing) |
| Database | [Bun SQL](https://bun.sh/docs/runtime/sql) | Built-in (SQLite/PostgreSQL/MySQL) |
| Template Engine | Custom built-in | Zero external dependencies (PHP/CI3 friendly) |
| Testing | [bun:test](https://bun.sh/docs/cli/test) | Built-in |

## ✨ Features

| Feature | Description |
|---------|-------------|
| MVC Architecture | Controller / Model / View separation |
| CLI Scaffolding | `make:scaffold` auto-generates full CRUD |
| Session Drivers | Interchangeable Memory / File / Redis (`SessionDriver` interface) |
| CSRF Protection | Bun.CSRF built-in + Double Submit Cookie (JS-readable) |
| Authentication | bcrypt-based Auth + `authGuard` / `guestGuard` |
| Validation | 20+ rules, CI3-style pipe syntax |
| File Uploads | MIME/extension/size validation, UUID/hash naming |
| Email | SMTP / sendmail (Bun.spawn/Bun.$) / log driver + template rendering |
| Cache | Memory / File / Redis drivers, `remember()` callback |
| WebSocket | Pub/Sub channels, Bun.serve websocket integration |
| CORS Middleware | Origin/method/header customization |
| Rate Limiting | Sliding window, IP-based, `X-RateLimit-*` headers |
| Route Model Binding | Automatic DB lookup from params + 404 |
| OpenAPI / Swagger | Auto-generate OpenAPI 3.0 spec from Router |
| Pagination | HTML navigation / API metadata |
| Logging | File + console, level filtering, log rotation |
| Integration Testing | `IntegrationTestClient` (automated HTTP requests) |
| Queue / Job System | Memory / Redis drivers, delayed execution, retries, failure handling |
| Scheduled Jobs | Bun.cron() in-process + OS-level cron |
| Queue Dashboard | HTML monitoring + JSON API |
| Redis Pub/Sub | BroadcastQueue, multi-server job distribution |
| Template Engine | Custom built-in — {{ }}, <?= ?>, <? ?>, include(), slot system |
| Query Builder | Active Record pattern, auto dialect switching for SQLite/PostgreSQL/MySQL |
| Biome | Lint + format (`bun run check`) |
| Archive | Bun.Archive built-in (tar/gzip) |
| Shell | Bun.spawn / Bun.$ built-in |
| Audit Log | Model event tracking + logging integration |
| Worker Pool | Bun.Worker parallel job processing |
| Distributed Lock | Redis Lua script atomic locking |
| Audit Log UI | HTML dashboard + SSE real-time |
| SSE | Server-Sent Events manager, channels, history |
| CLI REPL | AdonisJS Ace-style interactive shell |
| Image Editing | Bun.Image-based resize/rotate/convert |
| Cryptography | Bun.CryptoHasher + Bun.hash + Bun.password |

## 🚀 Quick Start

```bash
git clone <repo-url> bunigniter && cd bunigniter
bun install
bun run dev        # http://localhost:3000
```

## 📁 Project Structure

```
bunigniter/
├── system/core/          # Framework core (do not modify)
├── system/helpers/       # Global helper functions
├── app/config/           # Configuration (app, database, routes, email, cache, queue, scheduler)
├── app/controllers/      # Controllers
├── app/models/           # Models
├── app/views/            # Templates (.html)
├── app/views/layout/     # Layout templates
├── app/views/partials/   # Partial templates (for include)
├── app/middleware/        # Middleware
├── app/helpers/          # Custom helpers
├── app/libraries/        # Custom libraries
├── cli/commands/         # CLI commands
├── database/migrations/  # Migrations
├── database/seeds/       # Seeds
├── storage/              # logs, sessions, cache
├── public/               # Static files (css, js, uploads)
├── tests/                # Test files
└── docs/user-guide/      # Feature-specific guides
```

## ⌨️ CLI Summary

```bash
bun run bi make:scaffold post --fields=title:string,content:text  # Full CRUD scaffold
bun run bi make:scaffold post --api --fields=title:string         # API-only scaffold
bun run bi migrate                                               # Run migrations
bun run bi migrate:rollback --steps=3                            # Rollback migrations
bun run bi db:seed                                               # Run seeders
bun run bi list:routes                                           # List registered routes
```

## 🧪 Tests

```bash
bun test   # 620 pass, 0 fail
```

## 🔍 Lint & Format (Biome)

```bash
bun run check       # Lint + format check
bun run check:fix   # Auto-fix
bun run lint        # Lint only
bun run format      # Format only
```

## 🔄 CI3 ↔ BunIgniter

| CI3 | BunIgniter |
|-----|-----------|
| `CI_Controller` | `Controller` |
| `CI_Model` | `Model<T>` |
| `$this->load->view()` | `this.view()` |
| `$this->db->insert()` | `model.create()` |
| `$this->db->insert() + insert_id()` | `qb.insertReturning()` |
| `$this->form_validation` | `validate()` |
| `$this->ion_auth->login()` | `Auth.attempt()` |
| `$this->upload->do_upload()` | `Upload.save()` |
| `$this->input->cookie()` | `getCookie()` |
| `$this->input->set_cookie()` | `setCookie()` |
| `$this->load->view('partials/header')` | `<? include('partials/header') ?>` |
| `$layout['title'] = '...'` | `<!-- slot:title -->...<!-- endslot -->` |
| `<?php echo $title; ?>` | `{{ title }}` |
| `<?php echo htmlspecialchars($x); ?>` | `{{ x }}` (auto) or `<?= escapeHtml(x) ?>` |
| CI Zip | `Archive` (Bun.Archive) |
| PHP exec() | `Shell` (Bun.spawn) |

## 📖 Detailed Guides

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/user-guide/getting-started.md) | Installation, environment variables, project structure |
| [CLI Commands](docs/user-guide/cli.md) | Scaffolding, migrations, seeding |
| [Routing](docs/user-guide/routing.md) | Route definitions, resources, groups, model binding |
| [Controllers](docs/user-guide/controllers.md) | Controller class, Context, responses |
| [Models](docs/user-guide/models.md) | CRUD, pagination, transactions |
| [Views & Templates](docs/user-guide/views.md) | Template syntax, layouts, slots, include |
| [Database](docs/user-guide/database.md) | Configuration, migrations, seeding |
| [Middleware](docs/user-guide/middleware.md) | Pipeline, built-in middleware |
| [Authentication](docs/user-guide/auth.md) | Auth, authGuard, password hashing |
| [Validation](docs/user-guide/validation.md) | 20+ rules, custom messages |
| [CSRF Protection](docs/user-guide/csrf.md) | Double Submit Cookie |
| [Session](docs/user-guide/session.md) | Memory / File / Redis drivers |
| [File Upload](docs/user-guide/upload.md) | Single/multi upload, validation |
| [Pagination](docs/user-guide/pagination.md) | HTML / API |
| [Email](docs/user-guide/email.md) | SMTP / sendmail / log |
| [Cache](docs/user-guide/cache.md) | Memory / File / Redis, remember() |
| [Queue / Job System](docs/user-guide/queue.md) | Background jobs, delayed execution, retries |
| [Scheduled Jobs](docs/user-guide/scheduler.md) | Bun.cron(), in-process + OS-level |
| [Queue Dashboard](docs/user-guide/dashboard.md) | HTML monitoring + JSON API |
| [Redis Pub/Sub](docs/user-guide/broadcast-queue.md) | Multi-server job distribution |
| [Cookies](docs/user-guide/cookies.md) | Bun.Cookie / CookieMap |
| [Archive](docs/user-guide/archive.md) | Bun.Archive (tar/gzip) |
| [Shell](docs/user-guide/shell.md) | Bun.spawn / Bun.$ |
| [Audit Log](docs/user-guide/audit-log.md) | Model event tracking |
| [Worker Pool](docs/user-guide/worker-pool.md) | Bun.Worker parallel processing |
| [Distributed Lock](docs/user-guide/distributed-lock.md) | Redis atomic locking |
| [SSE](docs/user-guide/sse.md) | Server-Sent Events real-time |
| [Image Editing](docs/user-guide/image.md) | Bun.Image resize/convert |
| [Cryptography](docs/user-guide/crypto.md) | Hash/HMAC/password/UUID |
| [REPL](docs/user-guide/repl.md) | Interactive shell |
| [WebSocket](docs/user-guide/websocket.md) | Pub/Sub, Bun.serve integration |
| [CORS](docs/user-guide/cors.md) | Origins, preflight |
| [Rate Limiting](docs/user-guide/rate-limit.md) | Sliding window, IP-based |
| [Route Model Binding](docs/user-guide/route-model-binding.md) | Automatic DB lookup |
| [OpenAPI / Swagger](docs/user-guide/openapi.md) | Auto-generated spec, Swagger UI |
| [Logging](docs/user-guide/logging.md) | File + console, rotation |
| [Testing](docs/user-guide/testing.md) | Unit / integration tests |
| [Helper Functions](docs/user-guide/helpers.md) | URL, string, date, currency |

## 📜 License

MIT
