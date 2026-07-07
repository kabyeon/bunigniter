# CodeIgniter 3 vs BunIgniter — Completion Analysis & Roadmap

> Date: 2026-07-06
> Reference commit: `61f6837` (v0.6.4 — npm publish, init merge, auto routing)
> Current status: 620 tests pass, 0 fail, 0 external dependencies, Biome 0 errors

---

## 📊 Overall Summary

| Category | Completion | Lines of Code | Notes |
|----------|-----------|---------------|-------|
| **Core MVC** | 95% | controller + model | Controller/Model/View all implemented |
| **Routing** | 95% | router + auto_router | RESTful, resource, group, auto route, custom 404 |
| **Query Builder** | 90% | query_builder | Most of CI3 Active Record. No subqueries |
| **Database** | 90% | database + migrate | 3 adapters, migrations, seeds, status tracking. No schema builder |
| **Session** | 95% | session + 3 drivers | File/Memory/Redis, Flash, regenerate |
| **Security** | 95% | CSRF/CORS/RateLimit/SecHeaders | CSRF, CORS, Rate Limit, Security headers, CSP |
| **Template** | 85% | template + view | Slots/includes/partials/layouts |
| **CLI** | 85% | 17 commands | Includes migrate:status, REPL |
| **Helpers** | 90% | 10 files (9 categories) | URL/String/Date/Array/Form/HTML/Text/Inflector/Number/Cookie |
| **Libraries** | 80% | Multiple files | Auth/Email/Cache/Upload/UserAgent/Profiler/Autoload |
| **Extensions** | 80% | Multiple | Queue/SSE/WebSocket/Scheduler (not in CI3) |
| **Documentation** | 95% | 5196 (43 files) | API reference missing |
| **Tests** | 85% | 6118 (28 files, 620 tests) | E2E + security + unit + integration |

**Overall average: ~89%**

### Code Scale

```
Total code:     15,126 lines (55 files in system/)
Total tests:     6,118 lines (28 files, 620 tests, 1,121 expect() calls)
Total docs:      5,196 lines (43 markdown files)
External deps:   0 (only dev: @biomejs/biome)
```

---

## 📈 Per-Category Completion Visualization

```
Core MVC         ████████████████████░ 95%
Routing          ████████████████████░ 95%
Query Builder    ██████████████████░░░ 90%
Database         ██████████████████░░░ 90%
Session          ████████████████████░ 95%
Security         ████████████████████░ 95%
Template         █████████████████░░░░ 85%
CLI              █████████████████░░░░ 85%
Helpers          ██████████████████░░░ 90%
Libraries        ████████████████░░░░░ 80%
Extensions       ████████████████░░░░░ 80%
Docs             ████████████████████░ 95%
Tests            █████████████████░░░░ 85%
────────────────────────────────────────
Overall avg      ██████████████████░░░ 89%
```

---

## 1. Core MVC Architecture

| CI3 Feature | Status | Notes |
|-------------|--------|-------|
| `CI_Controller` | ✅ | `Controller` — view/json/redirect |
| `$this->load->view()` | ✅ | `this.view()` — slots + includes |
| `$this->output` | ✅ | `response.status().send()` chaining |
| `CI_Model` | ✅ | `Model<T>` — qb()/findAll/create/update/delete |
| `$this->db` | ✅ | `getDB()` — SQLite/PostgreSQL/MySQL |
| **Context (req/res)** | ✅ | `body()/params/query/request/response` |
| **Auto-loading** | ✅ | `autoload(config)` + `autoloadRegistry` — global helper/library/model loading |
| **Multiple controller** | ❌ | No child controller inheritance chain |
| **HMVC** | ❌ | No module separation |

---

## 2. Routing (`system/core/router.ts`)

| CI3 Feature | Status | Notes |
|-------------|--------|-------|
| Basic GET/POST/PUT/DELETE | ✅ | `router.get/post/put/delete/patch()` |
| RESTful resource | ✅ | `router.resource("/posts", ctrl)` |
| Route groups | ✅ | `router.group("/api", mw, cb)` |
| Middleware | ✅ | Global + per-route |
| Route model binding | ✅ | `RouteModelBinding` |
| Custom 404 handler | ✅ | `router.notFound(handler)` + auto JSON detection |
| Regex routes | ❌ | CI3 `$route['product/(:num)']` |
| HTTP method override | ❌ | `_method` form field not supported |
| Route naming | ❌ | `router.get("/users", ...).name("users")` missing |
| Route caching | ❌ | No production route compilation |

---

## 3. Query Builder / Active Record

| CI3 Feature | Status | Notes |
|-------------|--------|-------|
| `select()` | ✅ | + `selectRaw()`, `selectOnly()` |
| `from()` | ✅ | + `fromAs()` |
| `join/leftJoin/rightJoin` | ✅ | + `validateJoinTable()` |
| `where/orWhere` | ✅ | + `whereObject()` |
| `whereIn/orWhereIn/whereNotIn` | ✅ | |
| `whereBetween` | ✅ | |
| `whereNull/whereNotNull` | ✅ | |
| `like/orLike` | ✅ | before/after/both |
| `groupBy/having` | ✅ | + `groupByRaw()` |
| `orderBy` | ✅ | + `orderByRaw()`, `latest()/oldest()` |
| `limit/offset` | ✅ | |
| `distinct` | ✅ | |
| `get/first` | ✅ | |
| `insert/update/delete` | ✅ | |
| `insertReturning/updateReturning` | ✅ | MySQL SELECT fallback |
| `count/exists` | ✅ | |
| `paginate` | ✅ | |
| `clone` | ✅ | |
| `toSQL` | ✅ | Debug |
| Multi-adapter dialect | ✅ | SQLite/PostgreSQL/MySQL |
| `validateColumnName()` | ✅ | SQL injection defense |
| `selectCount/Sum/Avg/Max/Min` | ✅ | Aggregate functions |
| **Subqueries** | ❌ | `whereSub/whereExists` not implemented |
| **UNION** | ❌ | |
| **`orHaving`** | ❌ | |
| **`orWhereBetween`** | ❌ | |
| **`orWhereNotIn`** | ❌ | |
| **`notLike/orNotLike`** | ❌ | |
| **`havingIn/havingNotIn`** | ❌ | |
| **Transaction control** | ⚠️ | Only Model.transaction(), no manual begin/commit/rollback |
| **Query caching** | ❌ | |
| **Soft deletes** | ❌ | |

---

## 4. Database & Migrations

| CI3 Feature | Status | Notes |
|-------------|--------|-------|
| Multiple connections | ✅ | `getDB("group")` |
| SQLite/PostgreSQL/MySQL | ✅ | 3 adapters |
| Migration up/down | ✅ | Timestamp-based file names |
| Rollback | ✅ | `--steps=N` |
| Seeding | ✅ | `--files=` selective execution |
| Raw Query | ✅ | `sql\`...\`` + `sql.unsafe()` |
| Test DB injection | ✅ | `setDB()/resetDB()` |
| **Schema builder** | ❌ | No Fluent API like `createTable/addColumn` |
| **Migration status** | ✅ | `migrations` table batch tracking + `migrate:status` command |
| **DB seeding** | ❌ | No environment-aware auto seeding |
| **Read/write splitting** | ❌ | |

---

## 5. Session

| CI3 Feature | Status | Notes |
|-------------|--------|-------|
| Session set/get/delete | ✅ | `set/get/has/remove` |
| Flash data | ✅ | `flash/getFlash` |
| Session destruction | ✅ | `destroy()` |
| Session ID regeneration | ✅ | `regenerateId()` — session fixation defense |
| File driver | ✅ | `FileSession` |
| Memory driver | ✅ | `MemorySession` |
| Redis driver | ✅ | `RedisSession` |
| SessionDriver interface | ✅ | Swappable |
| **Database driver** | ❌ | CI3 `sess_driver = database` |
| **Auto session expiration cleanup** | ⚠️ | File has GC but auto-execution uncertain |
| **Tempdata** | ❌ | CI3 `mark_as_temp()` |

---

## 6. Security

| CI3 Feature | Status | Notes |
|-------------|--------|-------|
| CSRF (Double Submit Cookie) | ✅ | `Bun.CSRF.generate/verify` |
| XSS defense (escapeHtml) | ✅ | Template `{{ }}` auto-escaping |
| CORS | ✅ | Origin/method/credential control |
| Rate Limiting | ✅ | Sliding window + trustProxy |
| Upload validation | ✅ | Dangerous extension/MIME/size/path traversal |
| SQL injection defense | ✅ | `validateColumnName()` + parameter binding |
| Cookie security | ✅ | HttpOnly/Secure/SameSite |
| Session fixation defense | ✅ | `regenerateId()` |
| Timing attack defense | ✅ | Auth dummy hash verification |
| **Encryption** | ⚠️ | `crypto.ts` exists but not at CI3 `$this->encryption` level |
| **Content Security Policy** | ✅ | `createSecurityHeadersMiddleware({ csp: "default-src 'self'" })` |
| **Security headers** | ✅ | `securityHeadersMiddleware` — OWASP 7 + HSTS/CSP + X-Powered-By removal |

---

## 7. Template / View

| CI3 Feature | Status | Notes |
|-------------|--------|-------|
| `{{ expr }}` escaped output | ✅ | |
| `{{{ expr }}}` raw output | ✅ | |
| `<?= expr ?>` raw output | ✅ | PHP-friendly |
| `<? code ?>` control statements | ✅ | |
| `??` null coalescing | ✅ | |
| Slot system | ✅ | `<!-- slot:name -->...<!-- endslot -->` |
| Layouts | ✅ | `<!-- layout:name -->` |
| include() | ✅ | Recursive + additional data |
| Template caching | ✅ | `clearTemplateCache()` |
| **Helper functions** | ⚠️ | Limited built-in functions (date, upper, etc.) |
| **Partials (partials/)** | ✅ | `app/views/partials/` — nav, footer, head, alerts |
| **Components** | ❌ | No reusable UI components |
| **Conditional rendering** | ⚠️ | `<? if ?>` works but no convenience helpers |
| **Blade-style @syntax** | ❌ | Intentionally excluded (PHP-friendly design) |

---

## 8. CLI (spark / igniter)

| CI3 Feature | Status | Notes |
|-------------|--------|-------|
| `serve` | ✅ | Bun.serve-based |
| `make:controller` | ✅ | |
| `make:model` | ✅ | |
| `make:view` | ✅ | Includes slots + CSRF |
| `make:migration` | ✅ | |
| `make:middleware` | ✅ | |
| `make:scaffold` | ✅ | Batch CRUD generation |
| `make:helper/library` | ✅ | |
| `migrate / migrate:rollback` | ✅ | |
| `db:seed` | ✅ | |
| `list:routes` | ✅ | |
| `repl` | ✅ | |
| `routegen` | ✅ | |
| **`make:command`** | ❌ | Custom CLI command generator |
| **`migrate:status`** | ✅ | Shows applied/pending status + batch number |
| **`migrate:fresh`** | ❌ | DB reset + re-migration |
| **`db:create/drop`** | ❌ | |
| **Environment configuration** | ❌ | `ignite env production` |

---

## 9. Helpers (Compared to CI3's 21 Helpers)

| CI3 Helper | Status | BunIgniter Implementation |
|------------|--------|---------------------------|
| **URL Helper** | ✅ | `siteUrl/baseUrl/currentUrl/redirect` (`url_helper.ts`) |
| **String Helper** | ✅ | `slug/truncate/escapeHtml/unescapeHtml/camelize/pascalize/snakeCase/kebabCase/ucwords/randomString/reduceMultiples/stripQuotes` (`string_helper.ts`) |
| **Date Helper** | ✅ | `formatDate/timeAgo/now/nowFormatted/daysBetween/isValidDate/isToday/isYesterday/fromTimestamp/toTimestamp` (`date_helper.ts`) |
| **Array Helper** | ✅ | `element/elements/randomElement/groupBy/uniqueBy/chunk/flatten/deepMerge` (`array_helper.ts`) |
| **Form Helper** | ✅ | `formOpen/formClose/formInput/formPassword/formEmail/formHidden/formTextarea/formUpload/formDropdown/formMultiselect/formCheckbox/formRadio/formLabel/formSubmit/formReset/formButton/formError/setValue/setSelect/setCheckbox/setRadio/csrfField/methodField` (`form_helper.ts`) |
| **HTML Helper** | ✅ | `anchor/anchorPopup/mailto/img/heading/ul/ol/br/nbsp/meta/style/script` (`html_helper.ts`) |
| **Inflector Helper** | ✅ | `pluralize/singularize/classify/tableize/humanize` (`inflector_helper.ts`) |
| **Number Helper** | ✅ | `formatNumber/formatCurrency/formatBytes/formatPercent/plural/clamp/toRoman` (`number_helper.ts`) |
| **Text Helper** | ✅ | `wordLimiter/characterLimiter/asciiOnly/convertAccentedChars/wordCensor/highlightPhrase/wordWrap/ellipsize/autoLink/nl2br` (`text_helper.ts`) |
| **Typography Helper** | ❌ | No `auto_typography()` |
| **Security Helper** | ⚠️ | Only CSRF helper — no `do_hash/strip_image_tags` |
| **File Helper** | ❌ | No `write_file/delete_file/get_filenames` |
| **Directory Helper** | ❌ | No `directory_map()` |
| **Download Helper** | ❌ | No `force_download()` |
| **Cookie Helper** | ✅ | `getCookie/getCookies/setCookie/deleteCookie` (`cookie.ts`) |
| **Language Helper** | ❌ | No i18n system |
| **Path Helper** | ❌ | No `set_realpath()` |
| **Smiley Helper** | ❌ | (Legacy, unnecessary) |
| **XML Helper** | ❌ | (Legacy, unnecessary) |
| **CAPTCHA Helper** | ❌ | |
| **Profiling Helper** | ✅ | `Profiler` — benchmark/query/memory + HTML overlay |

---

## 10. Libraries

| CI3 Library | Status | Notes |
|-------------|--------|-------|
| **Auth** | ✅ | Session-based + bcrypt (not built into CI3) |
| **Email** | ✅ | SMTP/Sendmail/Log 3 drivers |
| **Cache** | ✅ | Memory/File/Redis + `remember()` |
| **Upload** | ✅ | Single/multiple + security validation |
| **Validation** | ✅ | 17 rules + custom messages |
| **Logger** | ✅ | 5 levels + file rotation |
| **Pagination** | ✅ | HTML generation + QueryBuilder integration |
| **Image** | ✅ | Resize/crop/format conversion |
| **Crypto** | ✅ | Bun.Crypto built-in |
| **Archive** | ✅ | ZIP/TAR/GZ |
| **Dashboard** | ✅ | Admin dashboard |
| **Audit Log** | ✅ | Audit logging |
| **Shell** | ✅ | Bun.$-based |
| **Form Validation** | ✅ | Integrated via Validator class |
| **Encryption** | ⚠️ | crypto.ts exists but not at CI3 `$this->encryption` level |
| **User Agent** | ✅ | Browser/OS/mobile/bot/tablet detection + static methods |
| **Table** | ❌ | No automatic HTML table generation |
| **Calendar** | ❌ | |
| **Cart** | ❌ | |
| **Trackback** | ❌ | (Legacy) |
| **XML-RPC** | ❌ | (Legacy) |
| **FTP** | ❌ | |
| **Zip** | ⚠️ | Partially replaced by Archive |
| **Javascript** | ❌ | (Legacy) |
| **Unit Test** | ⚠️ | Uses Bun:test, no CI3-style wrapper |
| **Profiler** | ✅ | `Profiler` — benchmark/query/memory measurement + HTML overlay |

---

## 11. BunIgniter Extensions (Not in CI3)

| Feature | Status | Notes |
|---------|--------|-------|
| **Queue** | ✅ | Memory/Redis/database drivers |
| **Broadcast Queue** | ✅ | Event broadcasting |
| **SSE** | ✅ | Server-Sent Events |
| **WebSocket** | ✅ | Bun.serve websocket |
| **Scheduler** | ✅ | Cron expression + job scheduling |
| **Worker Pool** | ✅ | Bun.Worker-based parallel processing |
| **Distributed Lock** | ✅ | Redis/file-based distributed locking |
| **OpenAPI** | ✅ | Automatic Swagger documentation generation |
| **Route Model Binding** | ✅ | Automatic model injection |
| **REPL** | ✅ | Interactive console |

---

## 12. Documentation & Tests

| Item | Status | Notes |
|------|--------|-------|
| Guide documentation | ✅ 43 files | Docs exist for nearly all features |
| API reference | ❌ | TSDoc exists but no separate API docs |
| Example app (Blog) | ✅ | CRUD + Auth + API |
| Unit tests | ✅ 620 | Security/QueryBuilder/Helpers/E2E/AutoRouter etc. |
| E2E tests | ✅ | `httpTest(router)` — GET/POST/PUT/DELETE + assertions |
| Performance benchmarks | ❌ | |
| Migration guide | ❌ | No CI3 → BunIgniter conversion guide |

---

## 🎯 Implementation Roadmap (By Priority)

### 🔴 High Priority (Core Feature Gaps)

Managed via checkboxes. Mark with `[x]` when complete.

#### H-1. Form Helper

- [x] `form_open(action, attributes, hidden)` — Form start + auto CSRF injection
- [x] `form_close()` — Form end
- [x] `form_input(name, value, attributes)` — Text input
- [x] `form_password(name, value, attributes)`
- [x] `form_email(name, value, attributes)`
- [x] `form_textarea(name, value, attributes)`
- [x] `form_hidden(name, value)`
- [x] `form_checkbox(name, value, checked, attributes)`
- [x] `form_radio(name, value, checked, attributes)`
- [x] `form_dropdown(name, options, selected, attributes)` — Select box
- [x] `form_multiselect(name, options, selected, attributes)`
- [x] `form_upload(name, attributes)`
- [x] `form_label(label, for, attributes)`
- [x] `form_button(name, content, attributes)`
- [x] `form_submit(name, value, attributes)`
- [x] `form_reset(name, value, attributes)`
- [x] `form_error(field, prefix, suffix)` — Validation error display
- [x] `set_value(field, default)` — Preserve re-entered values
- [x] `set_select(field, value, default)`
- [x] `set_checkbox(field, value, default)`
- [x] File: `system/helpers/form_helper.ts`
- [x] Tests: `tests/form_helper_test.ts`
- [x] Docs: `docs/user-guide/helpers.md` updated
- **Rationale**: Most used helper in CI3. Essential for form creation
- **Reference**: CI3 `form_helper.php`

#### H-2. E2E/Integration Test Infrastructure ✅

- [x] `system/core/e2e_test.ts` — HTTP request helper (httpTest)
- [x] `httpTest(router).get/post/put/patch/delete(path, body?)`
- [x] `assertStatus(response, status)`
- [x] `assertJson(response, expected)`
- [x] `assertRedirect(response, location)`
- [x] `assertBodyContains(response, text)`
- [x] Call Router.toBunServe() directly (no server needed)
- [x] Proxy-based req.params injection (Bun.serve simulation)
- [x] GET/POST/PUT/PATCH/DELETE request tests
- [x] 404 response (default HTML + auto JSON detection)
- [x] 405 Method Not Allowed
- [x] Custom 404 handler test
- [x] File: `system/core/e2e_test.ts`, `tests/e2e_test.ts`
- **Rationale**: Validates full HTTP request→response flow. Regression prevention

#### H-3. Migration Status Tracking (`migrations` table) ✅

- [x] Added `batch` column to `migrations` table
- [x] Auto-increment batch number on migration run
- [x] Rollback deletions by batch unit (--steps=N → rollback N batches)
- [x] `migrate:status` command — show applied/pending list
- [x] File: `cli/commands/migrate.ts`, `migraterollback.ts`, `migratestatus.ts`, `database/migrate.ts`
- [ ] Tests: Migration run/rollback/status query
- **Rationale**: Currently rollback only works in file-reverse order. Batch management needed

#### H-4. Custom 404 Handler ✅

- [x] Add `Router.notFound(handler)` method
- [x] Auto-detect JSON requests and return JSON error response
- [x] Default 404 page for HTML requests
- [x] File: modified `system/core/router.ts`
- [x] Tests: Verified in E2E tests
- **Rationale**: Currently hardcoded HTML. Not customizable

#### H-5. Security Headers Middleware ✅

- [x] `securityHeadersMiddleware` — Batch security header application
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] `createSecurityHeadersMiddleware(config)` — Custom configuration
  - HSTS, CSP, Cross-Origin-* headers
  - Individual header disable option (`false`)
- [x] Auto-remove X-Powered-By / Server headers
- [x] File: `system/core/security_headers.ts`
- [x] Tests: Default/custom/disabled validation

---

### 🟡 Medium Priority (CI3 Parity)

#### M-1. HTML Helper ✅

- [x] `anchor(url, text, attributes)` — `<a>` tag
- [x] `anchorPopup(url, text, attributes)`
- [x] `mailto(email, text, attributes)`
- [x] `img(src, attributes)` — `<img>` tag
- [x] `heading(text, level, attributes)` — `<h1>`~`<h6>`
- [x] `ul(items, attributes)` — `<ul>` list
- [x] `ol(items, attributes)` — `<ol>` list
- [x] `br(count)` — `<br>`
- [x] `nbsp(count)` — `&nbsp;`
- [x] `meta(name, content, type)` — `<meta>` tag
- [x] `style(href, attributes)` — `<link rel="stylesheet">`
- [x] `script(src, attributes)` — `<script>`
- [x] File: `system/helpers/html_helper.ts`
- [x] Tests: `tests/html_helper_test.ts`
- **Rationale**: Frequently used in views. Essential alongside Form Helper

#### M-2. Text Helper ✅

- [x] `wordLimiter(str, limit, suffix)` — Word count limit
- [x] `characterLimiter(str, limit, suffix)` — Character count limit
- [x] `asciiOnly(str)` — Extract ASCII only
- [x] `convertAccentedChars(str)` — Remove accents
- [x] `wordCensor(str, censored)` — Profanity filter
- [x] `highlightPhrase(str, phrase)` — Phrase highlighting
- [x] `wordWrap(str, limit)` — Word wrap
- [x] `ellipsize(str, maxLength, position)` — Ellipsis
- [x] `autoLink(str)` — Auto-link URLs/emails
- [x] `nl2br(str)` — Newline → `<br>`
- [x] File: `system/helpers/text_helper.ts`
- [x] Tests: `tests/text_helper_test.ts`
- **Rationale**: Essential for blogs/forums (summaries, ellipsis, etc.)

#### M-3. Inflector Helper ✅

- [x] `pluralize(word)` — Singular→plural (includes irregular)
- [x] `singularize(word)` — Plural→singular (includes irregular)
- [x] `classify(tableName)` — Table name→model name
- [x] `tableize(className)` — Model name→table name
- [x] `humanize(word)` — Human-readable form
- [x] File: `system/helpers/inflector_helper.ts`
- [x] Tests: `tests/inflector_helper_test.ts`
- **Rationale**: CLI generator + model name conversion (User ↔ users)

#### M-4. QueryBuilder Subqueries

- [ ] `whereSub(callback)` — Subquery WHERE
- [ ] `whereExists(callback)` — EXISTS subquery
- [ ] `whereNotExists(callback)`
- [ ] `fromSub(callback, alias)` — FROM subquery
- [ ] `selectSub(callback, alias)` — SELECT subquery
- [ ] `union(callback)` — UNION
- [ ] `unionAll(callback)` — UNION ALL
- [ ] Per-adapter dialect handling
- [ ] Tests: Subquery cases
- **Rationale**: Complex queries (e.g., posts with latest comments)

#### M-5. Soft Deletes

- [ ] `Model.softDelete = true` option
- [ ] Auto-handle `deletedAt` column
- [ ] `delete()` → `UPDATE SET deleted_at = NOW()` (soft)
- [ ] `forceDelete()` — Real DELETE (hard)
- [ ] `withTrashed()` — Include soft-deleted records
- [ ] `onlyTrashed()` — Only soft-deleted records
- [ ] `restore()` — Restore from soft delete
- [ ] Auto-apply `whereNull(deleted_at)` to QueryBuilder
- [ ] Tests: soft/hard delete, restore
- **Rationale**: `deleted_at` pattern is nearly standard

#### M-6. Partials Directory & Conventions ✅

- [x] Create `app/views/partials/` directory (nav, footer, head, alerts)
- [x] Blog app `examples/blog/app/views/partials/` (nav, footer)
- [x] Use `<? include('partials/nav') ?>` in layouts
- [x] File: `app/views/partials/nav.html`, `footer.html`, `head.html`, `alerts.html`
- **Rationale**: Mentioned in docs but not created. Improves reusability

#### M-7. Schema Builder (Fluent Migrations)

- [ ] `Schema.create(table, callback)` — Create table
- [ ] `Schema.table(table, callback)` — Modify table
- [ ] `Schema.drop(table)` — Drop table
- [ ] `Schema.dropIfExists(table)`
- [ ] Column types: `increments/integer/string/text/boolean/dateTime/json/binary`
- [ ] Column constraints: `nullable/default/unique/primary/foreign/index`
- [ ] File: `system/core/schema.ts` new
- [ ] Usable in migration files
- [ ] Tests: Schema create/modify/drop
- **Rationale**: Write migrations using Fluent API (Laravel style)

#### M-8. `migrate:fresh` Command

- [ ] DROP all tables then re-run migrations
- [ ] `--seed` option — Auto-run seeds after migration
- [ ] `--force` option — Skip production confirmation prompt
- [ ] File: `cli/commands/migratefresh.ts` new
- [ ] Register in registry
- **Rationale**: Frequently need DB reset during development

#### M-9. HTTP Method Override

- [ ] Support PUT/DELETE/PATCH via `_method` form field
- [ ] Support `X-HTTP-Method-Override` header
- [ ] Implement as middleware
- [ ] File: `system/core/method_override.ts` new
- [ ] Tests: Form/header override
- **Rationale**: Browser forms only support GET/POST. Need PUT/DELETE

#### M-10. QueryBuilder Additional WHERE Variants

- [ ] `orHaving(column, value)`
- [ ] `orWhereBetween(column, low, high)`
- [ ] `orWhereNotIn(column, values)`
- [ ] `notLike(column, value, side)`
- [ ] `orNotLike(column, value, side)`
- [ ] `havingIn(column, values)` / `havingNotIn(column, values)`
- [ ] Tests: Each variant case
- **Rationale**: Full CI3 Active Record parity

#### M-11. Manual Transaction Control

- [ ] `QueryBuilder.beginTransaction()`
- [ ] `QueryBuilder.commit()`
- [ ] `QueryBuilder.rollback()`
- [ ] `QueryBuilder.begin()` (named savepoint)
- [ ] Tests: Manual begin/commit/rollback
- **Rationale**: Model.transaction() alone is insufficient. Needs fine-grained control

#### M-12. Array Helper

- [ ] `element(item, array, default)` — Safe array access
- [ ] `elements(items, array, default)` — Multiple key lookup
- [ ] `randomElement(array)` — Random element
- [ ] File: `system/helpers/array_helper.ts`
- [ ] Tests: `tests/array_helper_test.ts`
- **Rationale**: CI3 compatibility

---

### 🟢 Low Priority (Nice-to-Have Features)

#### L-1. User Agent Library ✅

- [x] Browser detection (Chrome, Firefox, Safari, Edge, Opera, Vivaldi, Samsung Browser)
- [x] Mobile detection (iPhone, Android, Windows Phone, BlackBerry)
- [x] Tablet detection (iPad, Android Tablet, Kindle)
- [x] Bot detection (Googlebot, Bingbot, curl, wget, axios etc. 30+ patterns)
- [x] OS detection (Windows, macOS, iOS, Android, Linux, Chrome OS)
- [x] Static methods: `UserAgent.parse()`, `isBrowser()`, `isMobile()`, `isBot()`, `isTablet()`, `browser()`, `platform()`, `mobile()`
- [x] File: `system/core/user_agent.ts`
- [x] Tests: Browser/mobile/bot/static method validation

#### L-2. Internationalization (i18n)

- [ ] `app/lang/ko/app.ts`, `app/lang/en/app.ts` language files
- [ ] `lang(key, params)` helper function
- [ ] `{{ lang("welcome") }}` usage in templates
- [ ] Auto-detect browser language
- [ ] Language switching via session/cookie
- [ ] File: `system/core/i18n.ts` new
- [ ] Tests: Multi-language loading/switching
- **Rationale**: Korean-based, low priority but extensibility

#### L-3. Auto-loading ✅

- [x] `app/config/autoload.ts` — Auto-load configuration file
- [x] `autoloadRegistry` — Global registry for helpers/libraries/models
- [x] `autoload(config)` — Auto import and register based on config
- [x] `autoloadRegistry.getHelper/lib/model()` — Global access from controllers
- [x] `getAllHelperFunctions()` — Direct helper usage in templates
- [x] File: `system/core/autoload.ts`, `app/config/autoload.ts`
- [x] Tests: Register/lookup/merge/reset validation

#### L-4. Profiler ✅

- [x] `Profiler.start/end(name)` — Benchmark points
- [x] `Profiler.benchmark(name, callback)` — Callback measurement
- [x] `Profiler.logQuery()` — Query logging
- [x] `Profiler.getData()` — Benchmark/query/memory data
- [x] `Profiler.render()` — HTML overlay (CI3 Profiler Bar style)
- [x] `Profiler.enable()/reset()` — Enable/reset
- [x] Memory: current/peak, benchmark time/memory delta
- [x] File: `system/core/profiler.ts`
- [x] Tests: Benchmark/query/reset/render validation
- [ ] File: `system/core/profiler.ts` new
- **Rationale**: Debug/performance analysis

#### L-5. Auto Route ✅

- [x] `AutoRouter` class — URL → Controller/Method automatic mapping
- [x] `router.autoRoute()` — CI3 Auto Routing compatible
- [x] Explicit routes take precedence over auto routes
- [x] `defaultController`/`defaultMethod` configuration
- [x] `exclude` exclusion list
- [x] `middleware` auto-route-specific middleware
- [x] Subdirectory support (admin/users → admin/user_controller.ts)
- [x] Filename mapping: URL plural → snake_case singular
- [x] `_` prefix method exclusion (protect private methods)
- [x] Dev mode: ignore cache (hot reload)
- [x] File: `system/core/auto_router.ts`
- [x] Tests: 22 (parsing/disable/priority/exclusion/name conversion/singularization)

#### L-6. CI3 Migration Guide

- [ ] New `docs/migration/from-codeigniter3.md`
- [ ] PHP → TS conversion table (controller/model/view)
- [ ] CI3 function ↔ BunIgniter function mapping
- [ ] Step-by-step migration guide
- [ ] Real conversion examples
- **Rationale**: CI3 user onboarding

#### L-7. API Reference Documentation

- [ ] Auto-generate API docs from TSDoc
- [ ] Integrate TypeDoc or similar tool
- [ ] `docs/api/` directory
- **Rationale**: TSDoc exists but no separate API docs

#### L-8. File Helper

- [ ] `writeFile(path, data)`
- [ ] `deleteFile(path)`
- [ ] `getFilenames(dir, includePath)`
- [ ] `getDirFileInfo(dir)`
- [ ] `getFileInfo(path)`
- [ ] File: `system/helpers/file_helper.ts`
- **Rationale**: CI3 compatibility. File operation convenience

#### L-9. Download Helper

- [ ] `forceDownload(filename, data)`
- [ ] `downloadResponse(filePath)` — File download response
- [ ] File: `system/helpers/download_helper.ts`
- **Rationale**: File download functionality

#### L-10. CAPTCHA Helper

- [ ] Image CAPTCHA generation
- [ ] Validation logic
- [ ] File: `system/helpers/captcha_helper.ts`
- **Rationale**: Spam prevention (optional)

---

## 📋 Implementation Checklist Summary

### High Priority (5 items)

- [x] H-1. Form Helper
- [x] H-2. E2E/Integration Test Infrastructure
- [x] H-3. Migration Status Tracking
- [x] H-4. Custom 404 Handler
- [x] H-5. Security Headers Middleware

### Medium Priority (12 items)

- [x] M-1. HTML Helper
- [x] M-2. Text Helper
- [x] M-3. Inflector Helper
- [ ] M-4. QueryBuilder Subqueries
- [ ] M-5. Soft Deletes
- [x] M-6. Partials Directory & Conventions
- [ ] M-7. Schema Builder (Fluent Migrations)
- [ ] M-8. `migrate:fresh` Command
- [ ] M-9. HTTP Method Override
- [ ] M-10. QueryBuilder Additional WHERE Variants
- [ ] M-11. Manual Transaction Control
- [x] M-12. Array Helper

### Low Priority (10 items)

- [x] L-1. User Agent Library
- [ ] L-2. Internationalization (i18n)
- [x] L-3. Auto-loading
- [x] L-4. Profiler
- [x] L-5. Auto Route
- [ ] L-6. CI3 Migration Guide
- [ ] L-7. API Reference Documentation
- [ ] L-8. File Helper
- [ ] L-9. Download Helper
- [ ] L-10. CAPTCHA Helper

**Total: 27 items**

---

## 📌 Progress Log

Record below when implementation is complete:

| Date | Item | Commit | Notes |
|------|------|--------|-------|
| 2026-07-05 | (Start) | e2da8d0 | Analysis complete, roadmap written |
| 2026-07-05 | H-1, M-1, M-2, M-3, M-12 | - | Helper file split + Form/HTML/Text/Inflector/Array helpers implemented |
| 2026-07-05 | H-2, H-3, H-4 | - | E2E test infrastructure, migration batch tracking, 404 handler |
| 2026-07-06 | H-5, M-6, L-1, L-3, L-4 | - | Security headers, partials, User Agent, Autoload, Profiler |
| 2026-07-06 | L-5 (Auto Route) | 61f6837 | CI3-compatible Auto Routing + subdirectory support |

---

## 🔗 Related Files

- Core: `system/core/*.ts` (55 files)
- Helpers: `system/helpers/index.ts` + 9 category files (10 files)
- CLI: `cli/commands/*.ts` (17 commands)
- Tests: `tests/*.ts` (28 files, 620 tests)
- Docs: `docs/user-guide/*.md` (43 files)
- Example: `examples/blog/` (Blog app)
