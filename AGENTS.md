# AGENTS.md - BunIgniter Contributor Guide

This file is written to help both AI agents and human developers understand and contribute to the BunIgniter framework.

---

## Project Overview

BunIgniter is a full-stack web framework that reimplements CodeIgniter 3's MVC pattern in the Bun runtime environment.

### Core Design Principles

1. **CodeIgniter 3 Compatibility**: API structure that CI3 developers can intuitively understand
2. **Bun Native**: Prioritizes Bun runtime features such as Bun SQL, Bun.file, Bun.password
3. **Bun.serve Native**: HTTP layer uses Bun.serve's built-in router for SIMD-accelerated routing/middleware processing
4. **Custom Template Engine**: PHP/CI3-friendly `{{ }}`, `<?= ?>`, `<? ?>`, include(), slot system
5. **CLI Scaffolding**: Auto-generates MVC boilerplate in AdonisJS Ace style
6. **Lowercase File Names**: All TypeScript files use `snake_case` lowercase convention
7. **Driver Abstraction**: Session/cache and others use interface-based swappable drivers

---

## Architecture

### Layer Structure

```
Request → Bun.serve (HTTP) → Router → [Global Middleware] → [Route Middleware] → Controller → Model → Bun SQL
                                                                                   ↓
                                                                                View (Template Engine) → HTML Response
                                                                                    ↓
                                                                              JSON Response (API)
```

### Middleware Pipeline

```
Request → Global Middleware (router.use) → Route Middleware (router.resource 3rd argument)
           ↓ next()                        ↓ next()
         Pass/Block                      Pass/Block
                                           ↓
                                      Controller Handler
```

- Calling `next()` proceeds to the next middleware
- Returning a `Response` without calling `next()` stops the pipeline (blocks the request)
- `runMiddlewarePipeline()` executes the pipeline

### Core Flow

1. **Bootstrap** (`system/core/bootstrap.ts`): Creates Bun.serve server, serves static files, error handling, route registration, logger initialization, server start
2. **Router** (`system/core/router.ts`): Converts user-defined routes to Bun.serve routes (`toBunServe()`). Executes global + route middleware pipeline, resolves route model bindings, then calls `controller.method(ctx)`
3. **Controller** (`system/core/controller.ts`): Receives `Context` object and processes business logic. Responds with `this.view()`, `this.json()`, `this.redirect()`
4. **Model** (`system/core/model.ts`): CRUD based on Bun SQL tagged template literals. Provides type safety with generic types
5. **View** (`system/core/view.ts` + `system/core/template.ts`): Custom template engine + layout/slot system. Auto-layout binding via `<!-- layout:name -->` comments, `<!-- slot:name -->` slots, `include()` partials

---

## Directory Responsibilities

### `system/` - Framework Core (Do Not Modify)

| File | Responsibility | External Dependencies |
|------|---------------|----------------------|
| `core/bootstrap.ts` | Server start, Bun.serve config, error handling, logger integration | config.ts, database.ts, logger.ts |
| `core/config.ts` | Load config files from `app/config/`, caching | None |
| `core/controller.ts` | Base controller class, `view()`/`json()`/`redirect()` | view.ts |
| `core/database.ts` | Bun SQL connection management, multi-group support | bun (SQL), config.ts |
| `core/model.ts` | Base model class, CRUD/pagination/transactions | database.ts |
| `core/router.ts` | Route definition → Bun.serve routes conversion (`toBunServe()`), `resource()`/`group()`, auto-route (`autoRoute()`), middleware pipeline, route model binding | controller.ts, middleware.ts, route_model_binding.ts, auto_router.ts |
| `core/view.ts` | View rendering entry point | template.ts |
| `core/template.ts` | Custom template engine, compilation, slots, include() | — |
| `core/middleware.ts` | Middleware pipeline (`runMiddlewarePipeline`), `MiddlewareContext` type | None |
| `core/session.ts` | In-memory cookie-based sessions, flash data | None |
| `core/session_driver.ts` | `SessionDriver` interface + `SessionConfig` type | None |
| `core/memory_session.ts` | `MemorySession` (in-memory, implements `SessionDriver`) | None |
| `core/file_session.ts` | `FileSession` (file-based, implements `SessionDriver`), GC, flash data | None |
| `core/session_manager.ts` | `createSession()` factory (async), auto-selects driver based on config | session_driver.ts, memory_session.ts, file_session.ts, redis_session.ts |
| `core/redis_session.ts` | `RedisSession` (Bun RedisClient, implements `SessionDriver`), async load/save/destroy | bun (RedisClient) |
| `core/input.ts` | Request input helpers (POST/GET/headers/IP) | None |
| `core/csrf.ts` | CSRF Double Submit Cookie, `csrfMiddleware`, `csrfField`, `csrfMeta` | None |
| `core/validator.ts` | `Validator.check`, `validate` function, 20+ validation rules | None |
| `core/auth.ts` | `Auth` class (bcrypt), `authGuard`/`guestGuard` middleware | session_manager.ts, database.ts |
| `core/upload.ts` | `Upload.save`/`saveMany`/`delete`, MIME/extension/size validation | None |
| `core/pagination.ts` | `paginationHtml`/`Info`/`Meta`, HTML navigation generation | None |
| `core/logger.ts` | `Logger` class, file + console output, level filtering, log rotation | None |
| `core/email.ts` | `Email` class, SMTP/sendmail/log drivers, `sendTemplate()` | — |
| `core/cache.ts` | `Cache` manager, `CacheDriver` interface (async), `MemoryCacheDriver`/`FileCacheDriver` | None |
| `core/redis_cache.ts` | `RedisCacheDriver` (Bun RedisClient, implements `CacheDriver`) | bun (RedisClient) |
| `core/websocket.ts` | `WebSocketManager` class, Pub/Sub channels, Bun.serve websocket configuration | None |
| `core/cors.ts` | `corsMiddleware`, `createCorsMiddleware(config)`, preflight | None |
| `core/rate_limit.ts` | `rateLimitMiddleware`, sliding window, IP-based, `X-RateLimit-*` | None |
| `core/route_model_binding.ts` | `RouteModelBinding.bind()/resolve()`, auto DB lookup + 404 | None |
| `core/openapi.ts` | `OpenApiGenerator`, Router → OpenAPI 3.0 spec, Swagger UI | None |
| `core/integration_test.ts` | `IntegrationTestClient`, `startTestServer`/`stopTestServer` | None |
| `core/queue.ts` | `Queue` manager, `QueueDriver` interface, `MemoryQueueDriver`/`RedisQueueDriver`, delayed execution, retries | bun (RedisClient) |
| `core/scheduler.ts` | `Scheduler` manager, `Bun.cron()` in-process + OS-level cron, `Bun.cron.parse()` | bun (Bun.cron) |
| `core/dashboard.ts` | Queue monitoring dashboard (HTML + JSON API), `createDashboardRoutes()` | queue.ts, scheduler.ts |
| `core/broadcast_queue.ts` | `BroadcastQueue`, Redis Pub/Sub broadcast, `RedisClient.subscribe/publish` | bun (RedisClient) |
| `core/cookie.ts` | Cookie helpers, `Bun.Cookie`/`Bun.CookieMap` built-in | bun (Bun.Cookie) |
| `core/archive.ts` | Archive utilities, `Bun.Archive` built-in (tar/gzip) | bun (Bun.Archive) |
| `core/shell.ts` | Shell helpers, `Bun.spawn`/`Bun.$` built-in | bun (Bun.spawn) |
| `core/worker_pool.ts` | `WorkerPool`, Bun.Worker parallel job processing, IPC messages, worker restart | bun (Worker) |
| `core/distributed_lock.ts` | `DistributedLock`, Redis/Memory distributed lock, Lua scripts, `runScheduled()` | bun (RedisClient) |
| `core/audit_log_ui.ts` | Audit log web UI, HTML dashboard, SSE real-time, API endpoints | audit_log.ts |
| `core/sse.ts` | `SSEManager`, Server-Sent Events manager, channels, history, broadcast | ReadableStream |
| `core/image.ts` | `ImageEditor`, Bun.Image chainable pipeline, resize/rotate/convert | bun (Bun.Image) |
| `core/crypto.ts` | `Crypto`, Bun.CryptoHasher/Bun.hash/Bun.password, HMAC, UUID, tokens | bun (Crypto) |
| `core/audit_log.ts` | Audit log manager, model event tracking, `AuditLogModel` | model.ts, logger.ts |
| `core/test_helper.ts` | `createTestDB`, `testRequest`, `parseJsonResponse` | bun:test |
| `core/e2e_test.ts` | `httpTest(router)` E2E testing, assertion helpers | None |
| `core/auto_router.ts` | `AutoRouter` class, URL → Controller/Method auto-mapping, CI3 Auto Routing | logger.ts |
| `core/security_headers.ts` | `securityHeadersMiddleware`, `createSecurityHeadersMiddleware(config)`, OWASP security headers | None |
| `core/user_agent.ts` | `UserAgent` class, browser/OS/mobile/bot/tablet detection | None |
| `core/autoload.ts` | `autoloadRegistry`, `autoload(config)`, global loading of helpers/libraries/models | None |
| `core/profiler.ts` | `Profiler` class, benchmark/query/memory measurement, HTML overlay | logger.ts |
| `helpers/index.ts` | Global helpers barrel re-export (9 categories) | None |

### `app/` - User Application

| Directory | Responsibility |
|-----------|---------------|
| `config/` | App/DB/route/email/cache/queue configuration |
| `controllers/` | HTTP request handling |
| `models/` | Database operations |
| `views/` | HTML templates ({{ }}, <?= ?>, <? ?>) |
| `views/layout/` | Layout templates |
| `middleware/` | Middleware |
| `helpers/` | Custom helper functions |
| `libraries/` | Custom library classes |

### `cli/` - CLI Scaffolding System

| File | Responsibility |
|------|---------------|
| `index.ts` | CLI entry point, command routing |
| `registry.ts` | Command registration/lookup, help output |
| `utils.ts` | Name conversion (PascalCase/snake_case/pluralization), file creation, argument parsing |
| `commands/makescaffold.ts` | Core: Concurrent Controller + Model + View + Migration generation. `--api` flag, auto route registration |
| `commands/makecontroller.ts` | Controller generation, includes CRUD methods with `--resource` |
| `commands/makemodel.ts` | Model generation, auto-generates interface with `--fields` |
| `commands/makeview.ts` | View template generation, creates index/show/create/edit with `--resource` |
| `commands/makemigration.ts` | Migration file generation, auto-detects `create_`/`add_` prefixes |
| `commands/makemiddleware.ts` | Middleware function generation |
| `commands/makehelper.ts` | Helper file generation |
| `commands/makelibrary.ts` | Library class generation |
| `commands/routegen.ts` | Route code generation + auto-registration in `routes.ts` (duplicate detection) |
| `commands/migrate.ts` | `migrate` — Run migrations, execute only unrun up(), manage tracking table |
| `commands/serve.ts` | `serve` — Start dev server (`Bun.spawn` + `--hot`), `--port`/`--host` options |
| `commands/listroutes.ts` | `list:routes` — Parse routes.ts, color-coded output by HTTP method, resource expansion |
| `commands/dbseed.ts` | `make:seed` (seeder creation) + `db:seed` (seeder execution) |
| `commands/repl.ts` | `repl` (interactive REPL shell, AdonisJS Ace style) |
| `commands/migraterollback.ts` | `migrate:rollback` (migration rollback, `--steps`/`--all`) |

### `database/` - Migrations & Seeds

| File/Directory | Responsibility |
|---------------|---------------|
| `migrate.ts` | Migration runner. Tracks execution via `migrations` table |
| `migrations/*.ts` | Individual migrations. Exports `up()`/`down()` |
| `seeds/*.ts` | Seed files. Exports `run()` |

### `storage/` - Runtime Storage

| Directory | Responsibility |
|-----------|---------------|
| `logs/` | Log files (`app-YYYY-MM-DD.log`) |
| `sessions/` | File-based sessions (`sess_<uuid>`) |
| `cache/` | File cache (hash key files) |

### `docs/user-guide/` - Feature-Specific Guides

42 markdown files (getting-started, cli, routing, controllers, models, views, database, middleware, auth, validation, csrf, session, upload, pagination, email, cache, websocket, cors, rate-limit, route-model-binding, openapi, logging, testing, helpers, queue, scheduler, dashboard, broadcast-queue, cookies, archive, shell, audit-log, worker-pool, distributed-lock, sse, image, crypto, security-headers, user-agent, autoload, profiler, query-builder, repl)

### `tests/` - Tests

| File | Target | Test Count |
|------|--------|------------|
| `validator_test.ts` | Validator / validate function | 14 |
| `helpers_test.ts` | slug, truncate, escapeHtml, formatDate, timeAgo, etc. | 53 |
| `pagination_test.ts` | paginationHtml / Info / Meta | 8 |
| `upload_test.ts` | Upload.formatFileSize / isImage | 6 |
| `cache_test.ts` | Cache, MemoryCacheDriver, FileCacheDriver | 14 |
| `middleware_test.ts` | CORS / Rate Limit middleware | 7 |
| `route_binding_test.ts` | RouteModelBinding | 6 |
| `openapi_test.ts` | OpenApiGenerator | 8 |
| `queue_test.ts` | Queue, MemoryQueueDriver | 15 |
| `redis_test.ts` | RedisSession, RedisCacheDriver structure validation | 15 |
| `scheduler_test.ts` | Scheduler, Bun.cron parsing | 16 |
| `feature_test.ts` | Cookie, Archive, Shell, AuditLog | 30 |
| `feature2_test.ts` | WorkerPool, DistributedLock, AuditLogUI | 43 |
| `feature3_test.ts` | SSE, ImageEditor, Crypto | 61 |
| `feature4_test.ts` | CSRF (Bun.CSRF), Email, CLI | 56 |
| `query_builder_test.ts` | QueryBuilder CRUD/Injection/Model integration | 56 |
| `query_builder_dialect_test.ts` | QueryBuilder dialects (SQLite/MySQL/PostgreSQL) | 16 |
| `security_test.ts` | CSRF XSS, Upload path traversal, Model SQL injection, CORS security, Rate Limit IP spoofing, Session Fixation, Crypto | 30 |
| `form_helper_test.ts` | Form Helper | 28 |
| `html_helper_test.ts` | HTML Helper | 16 |
| `text_helper_test.ts` | Text Helper | 18 |
| `inflector_helper_test.ts` | Inflector Helper | 19 |
| `e2e_test.ts` | E2E tests | 14 |
| `autoload_test.ts` | Autoload system | 7 |
| `auto_router_test.ts` | AutoRouter | 19 |
| `security_profiler_test.ts` | Security Headers, User Agent, Profiler | 24 |

---

## Coding Conventions

### File Names

- **All TypeScript files are lowercase snake_case**: `user_model.ts`, `auth_middleware.ts`
- **View templates are lowercase**: `index.html`, `show.html`
- **Migrations use timestamp prefix**: `1783262870269_create_posts_table.ts`
- **Seeders are lowercase**: `user_seeder.ts`

### Class/Interface Naming

| Type | Naming Convention | Example |
|------|-------------------|---------|
| Controller class | `{Name}Controller` | `PostController` |
| Model class | `{Name}Model` | `PostModel` |
| Interface | `{Name}Interface` | `PostInterface` |
| Middleware function | `{name}Middleware` | `authMiddleware` |
| Library class | `{Name}Library` | `EmailLibrary` |

### Import Paths

```typescript
// System modules - include .ts extension
import { Controller } from "system/core/controller.ts";
import { Model } from "system/core/model.ts";
import { Router } from "system/core/router.ts";
import { validate } from "system/core/validator.ts";
import { Auth, authGuard } from "system/core/auth.ts";
import { Upload } from "system/core/upload.ts";
import { logger } from "system/core/logger.ts";
import { csrfMiddleware, csrfField } from "system/core/csrf.ts";
import { paginationHtml } from "system/core/pagination.ts";
import { createSession } from "system/core/session_manager.ts";
import { Email } from "system/core/email.ts";
import { Cache } from "system/core/cache.ts";
import { WebSocketManager } from "system/core/websocket.ts";
import { corsMiddleware, createCorsMiddleware } from "system/core/cors.ts";
import { rateLimitMiddleware, createRateLimitMiddleware } from "system/core/rate_limit.ts";
import { RouteModelBinding } from "system/core/route_model_binding.ts";
import { OpenApiGenerator } from "system/core/openapi.ts";
import { createIntegrationTestClient } from "system/core/integration_test.ts";
import { securityHeadersMiddleware, createSecurityHeadersMiddleware } from "system/core/security_headers.ts";
import { UserAgent } from "system/core/user_agent.ts";
import { autoloadRegistry, autoload } from "system/core/autoload.ts";
import { Profiler } from "system/core/profiler.ts";
import { httpTest } from "system/core/e2e_test.ts";

// App modules - include .ts extension
import userModel from "app/models/user_model.ts";
import authMiddleware from "app/middleware/auth_middleware.ts";
```

### Controller Pattern

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import resourceModel from "app/models/resource_model.ts";

export class ResourceController extends Controller {
  async index({ request, response }: Context) { /* List */ }
  async show({ request, params, response }: Context) { /* Detail */ }
  async create({ request, response }: Context) { /* Create form */ }
  async store({ request, response }: Context) { /* Save */ }
  async edit({ request, params, response }: Context) { /* Edit form */ }
  async update({ request, params, response }: Context) { /* Update */ }
  async delete({ request, params, response }: Context) { /* Delete */ }
}

// default export = singleton instance
export default new ResourceController();
```

### Model Pattern

```typescript
import { Model } from "system/core/model.ts";

export interface ResourceInterface {
  id?: number;
  // fields...
  created_at?: string;
  updated_at?: string;
}

export class ResourceModel extends Model<ResourceInterface> {
  override tableName = "resources";  // Must override
}

export default new ResourceModel();
```

### View Pattern

```html
<!-- layout:default -->              <!-- Layout specification (optional) -->

<h1>{{ title }}</h1>                <!-- Escaped output -->

<? for (const item of items) { ?>   <!-- Loop -->
  <li>{{ item.name }}</li>
<? } ?>

<? if (condition) { ?>              <!-- Condition -->
  <p>True</p>
<? } ?>
```

---

## Contribution Guidelines

### When Modifying `system/`

- `system/` is the core shared by all applications. Avoid breaking changes to existing APIs
- When adding new core modules, add exports to `system/core/index.ts`
- When adding new methods to the `Model` class, maintain backward compatibility

### When Adding CLI Commands

1. Create a new file in `cli/commands/` (lowercase)
2. Implement the `Command` interface:

```typescript
import type { Command } from "../registry.ts";
import { createFile, parseArgs } from "../utils.ts";

export const makeSomething: Command = {
  name: "make:something",
  description: "Description",
  usage: "bun run bi make:something <name>",
  options: [
    { flag: "--option", description: "Option description" },
  ],
  async run(args: string[]): Promise<void> {
    // Implementation
  },
};
```

1. Register it in `cli/index.ts`:

```typescript
import { makeSomething } from "./commands/makesomething.ts";
registry.register("make:something", makeSomething);
```

### When Modifying View Templates

- The `<!-- layout:name -->` comment must be on the first line
- The `{{{ content }}}` marker in layouts is matched by the regex `/\{\{\{\s*content\s*\}\}\}/`
- In development, templates are recompiled on every request (no caching)

### Database-Related

- The `findWhere()` method in the `Model` class internally uses `sql.unsafe()`. Do not pass user input directly to prevent SQL injection
- `create()` and `update()` safely bind parameters using Bun SQL's `sql(object)` helper
- SQLite runs synchronously but the API returns `Promise`. PostgreSQL/MySQL are async

### Migration-Related

- Migration file names must start with a timestamp to guarantee execution order
- Always export `up()` and `down()`
- `migrate.ts` runner and `migraterollback.ts` each create separate SQLite connections
- Seeders must export `run()`

### Authentication-Related

- The `Auth` class uses the `SessionManager` factory (`createSession()`). The driver is auto-selected based on `session.driver` in config
- Password hashing uses Bun's built-in `Bun.password.hash()`/`verify()` (bcrypt)
- `authGuard` redirects unauthenticated users to `/login`

### CSRF-Related

- The CSRF token is stored in a cookie (`csrf_token`). **The cookie is NOT HttpOnly** (readable by JavaScript)
- Clients send the token via a form hidden field, header (`X-CSRF-Token`), or query parameter
- GET/HEAD/OPTIONS requests are excluded from validation
- Double Submit Cookie: verifies cookie token == request token match

### Session Driver Related

- `SessionDriver` interface: `set`, `get`, `has`, `remove`, `all`, `flash`, `getFlash`, `save`, `destroy`, `getId`, `getCookieHeader`
- Create sessions via `createSession(request, config?)` factory. Select driver with `config.driver`
- `createSession` is an async function (`await createSession(...)`)
- `RedisSession` requires `await session.load()` call
- To add a new driver: implement the `SessionDriver` interface → register in `session_manager.ts`

### Cache Driver Related

- `CacheDriver` interface: `set`, `get`, `has`, `forget`, `pull`, `flush`, `gc` (all async-compatible)
- Access via `Cache` static manager. Change driver/settings with `Cache.configure()`
- `RedisCacheDriver` uses Bun's built-in RedisClient. Auto-manages TTL with `SET ... EX`
- `FileCacheDriver` stores files based on hash keys. Saves to `storage/cache/`
- The redis driver in `Cache.getDriver()` is loaded via lazy import (require)

### Email-Related

- The SMTP driver uses `Bun.connect()` for raw TCP sockets. Implements SMTP protocol handshake directly
- `sendTemplate()` renders with the custom template engine and uses it as the email body
- In development, using the `log` driver is recommended (`storage/logs/emails.log`)

### Rate Limiting Related

- In-memory Map-based sliding window. Resets on server restart
- Auto GC runs every 5 minutes. Manual cleanup via `cleanupRateLimitStore()`
- Custom `keyGenerator` allows integration with external stores like Redis

### Logging Related

- Log files are stored at `storage/logs/app-YYYY-MM-DD.log`
- Development: outputs debug and above, Production: outputs info and above
- Log rotation occurs when exceeding 10MB, keeping up to 30 files

---

## Testing

### Running

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Specific file
bun test tests/validator_test.ts
```

### Test Writing Pattern

```typescript
import { describe, test, expect } from "bun:test";

describe("Feature name", () => {
  test("specific behavior", () => {
    expect(actualValue).toBe(expectedValue);
  });
});
```

### Using Test Helpers

```typescript
import { createTestDB, testRequest, parseJsonResponse } from "../system/core/test_helper.ts";

// DB-related tests with in-memory DB
const db = await createTestDB();
await db`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`;
const result = await db`SELECT * FROM users`;
await db.close();
```

### Integration Tests

```typescript
import { createIntegrationTestClient } from "../system/core/integration_test.ts";

const { client, close } = await createIntegrationTestClient(3999);

const res = await client.get("/users");
await client.assertStatus("/users", 200);
const json = await client.getJson("/api/posts");

close(); // Must close
```

### E2E Tests (No Server Required)

```typescript
import { httpTest } from "../system/core/e2e_test.ts";

const test = httpTest(router);
const res = await test.get("/users");
test.assertStatus(res, 200);
test.assertJson(res, { success: true });
test.assertRedirect(await test.get("/old-path"), "/new-path");
```

### Testing Guidelines

- Create test files in `tests/` directory using `*_test.ts` format
- Prioritize unit tests without external service dependencies
- Use `createTestDB()` for DB-required tests (in-memory SQLite)
- Use `createIntegrationTestClient()` for integration tests
- Current: **620 pass, 0 fail, 1121 expect() calls across 28 files**

---

## Development Roadmap

Completed features:

- [x] Session driver abstraction (SessionDriver interface, Memory/File/Redis)
- [x] CSRF Double Submit Cookie (JS-readable)
- [x] Email sending library (SMTP/sendmail/log)
- [x] Cache library (Memory + File + Redis drivers)
- [x] WebSocket support (Pub/Sub + Bun.serve websocket)
- [x] Auto-register API routes with `make:scaffold --api`
- [x] Route model binding
- [x] CORS middleware
- [x] Rate Limiting middleware
- [x] OpenAPI / Swagger auto-generation
- [x] Integration test helper
- [x] Redis session driver (Bun built-in RedisClient)
- [x] Email config file (`app/config/email.ts`)
- [x] Cache config file (`app/config/cache.ts`)
- [x] Queue/Job system (Memory + Redis drivers)
- [x] Redis cache driver (Bun built-in RedisClient)
- [x] Queue monitoring dashboard (HTML + JSON API)
- [x] Scheduled jobs / Cron (Bun.cron built-in)
- [x] Redis Pub/Sub broadcast queue (Bun built-in RedisClient)
- [x] Cookie helpers (Bun.Cookie / CookieMap built-in)
- [x] Archive utilities (Bun.Archive built-in, replaces CI3 Zip)
- [x] Shell helpers (Bun.spawn / Bun.$ built-in, replaces CI3 exec)
- [x] Audit log (model event tracking + logging integration, replaces CI3 DB tracking)
- [x] E2E test infrastructure (`httpTest(router)` assertion helpers)
- [x] Migration status tracking (`migrate:status` command, batch rollback)
- [x] 404 custom handler (`Router.notFound()`)
- [x] Security headers middleware (OWASP recommended, HSTS/CSP support)
- [x] Partials directory and conventions (`app/views/partials/`)
- [x] User Agent library (browser/OS/mobile/bot/tablet detection)
- [x] Autoload system (CI3 autoload.php compatible)
- [x] Profiler (benchmark/query/memory, HTML overlay)

Open for contributions:

- [ ] Docker support
- [ ] CI/CD pipeline
- [x] Queue worker with Bun.Worker-based parallel processing
- [x] Scheduled job distributed locking (Redis)
- [x] Audit log web UI
