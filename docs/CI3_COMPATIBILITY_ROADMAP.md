# CodeIgniter 3 대비 BunIgniter 완성도 분석 및 로드맵

> 작성일: 2026-07-05
> 기준 커밋: `e2da8d0` (QueryBuilder SQL 인젝션 방어)
> 현재 상태: 435 tests pass, 0 fail, 0 외부 의존성, Biome 0 errors

---

## 📊 전체 요약

| 카테고리 | 완성도 | 코드 라인 | 비고 |
|----------|--------|-----------|------|
| **코어 MVC** | 95% | 79 (controller) + 216 (model) | Controller/Model/View 모두 구현 |
| **라우팅** | 90% | 328 | RESTful, resource, group. 404 커스텀 불가 |
| **Query Builder** | 90% | 1163 | CI3 Active Record 대부분. 서브쿼리 미지원 |
| **데이터베이스** | 85% | 131 | 3어댑터, 마이그레이션, 시드. 스키마 빌더 없음 |
| **세션** | 95% | 138 + 3드라이버 | File/Memory/Redis, Flash, regenerate |
| **보안** | 90% | CSRF 284 + 기타 | CSRF, CORS, Rate Limit. Security 헤더 미흡 |
| **템플릿** | 80% | 361 | 슬롯/인클루드. 헬퍼 함수 한정 |
| **CLI** | 75% | 15개 명령 | 환경설정/마이그레이션 상태 미흡 |
| **헬퍼** | 60% | 226 | URL/문자열/날짜만. CI3 21개 헬퍼 대비 부족 |
| **라이브러리** | 70% | 다수 파일 | Auth/Email/Cache/Upload. CI3 대비 미구현 다수 |
| **확장기능** | 80% | 다수 | Queue/SSE/WebSocket/Scheduler (CI3 없음) |
| **문서** | 90% | 4244 (37개) | API 레퍼런스 부족 |
| **테스트** | 75% | 4465 (435개) | E2E/통합테스트 부족 |

**전체 평균: ~83%**

### 코드 규모

```
총 코드:    13,443 lines (48 files in system/)
총 테스트:   4,465 lines (19 files, 435 tests, 773 expect() calls)
총 문서:     4,244 lines (37 markdown files)
외부 의존성: 0 (오직 dev: @biomejs/biome)
```

---

## 📈 카테고리별 완성도 시각화

```
코어 MVC        ████████████████████░ 95%
라우팅          ██████████████████░░░ 90%
Query Builder   ██████████████████░░░ 90%
데이터베이스    █████████████████░░░░ 85%
세션            ████████████████████░ 95%
보안            ██████████████████░░░ 90%
템플릿          ████████████████░░░░░ 80%
CLI             ███████████████░░░░░░ 75%
헬퍼            ████████████░░░░░░░░░ 60%
라이브러리      ██████████████░░░░░░░ 70%
확장기능        ████████████████░░░░░ 80%
문서            ██████████████████░░░ 90%
테스트          ███████████████░░░░░░ 75%
────────────────────────────────────────
전체 평균       ████████████████░░░░░ 83%
```

---

## 1. 코어 MVC 아키텍처

| CI3 기능 | 상태 | 비고 |
|----------|------|------|
| `CI_Controller` | ✅ | `Controller` — view/json/redirect |
| `$this->load->view()` | ✅ | `this.view()` — 슬롯+인클루드 |
| `$this->output` | ✅ | `response.status().send()` 체이닝 |
| `CI_Model` | ✅ | `Model<T>` — qb()/findAll/create/update/delete |
| `$this->db` | ✅ | `getDB()` — SQLite/PostgreSQL/MySQL |
| **Context (req/res)** | ✅ | `body()/params/query/request/response` |
| **Auto-loading** | ❌ | CI3 `$autoload['libraries']` 없음 |
| **Multiple controller** | ❌ | 하위 컨트롤러 상속 체인 미지원 |
| **HMVC** | ❌ | 모듈 분리 미지원 |

---

## 2. 라우팅 (`system/core/router.ts`)

| CI3 기능 | 상태 | 비고 |
|----------|------|------|
| 기본 GET/POST/PUT/DELETE | ✅ | `router.get/post/put/delete/patch()` |
| RESTful resource | ✅ | `router.resource("/posts", ctrl)` |
| 라우트 그룹 | ✅ | `router.group("/api", mw, cb)` |
| 미들웨어 | ✅ | 글로벌 + 라우트별 |
| 라우트 모델 바인딩 | ✅ | `RouteModelBinding` |
| 404 커스텀 핸들러 | ❌ | 기본 HTML 하드코딩 |
| 정규식 라우트 | ❌ | CI3 `$route['product/(:num)']` |
| HTTP 메서드 오버라이드 | ❌ | `_method` 폼 필드 미지원 |
| 라우트 네이밍 | ❌ | `router.get("/users", ...).name("users")` 없음 |
| 라우트 캐시 | ❌ | 프로덕션 라우트 컴파일 없음 |

---

## 3. Query Builder / Active Record

| CI3 기능 | 상태 | 비고 |
|----------|------|------|
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
| `insertReturning/updateReturning` | ✅ | MySQL SELECT 폴백 |
| `count/exists` | ✅ | |
| `paginate` | ✅ | |
| `clone` | ✅ | |
| `toSQL` | ✅ | 디버그 |
| 멀티 어댑터 방언 | ✅ | SQLite/PostgreSQL/MySQL |
| `validateColumnName()` | ✅ | SQL 인젝션 방어 |
| `selectCount/Sum/Avg/Max/Min` | ✅ | 집계 함수 |
| **서브쿼리** | ❌ | `whereSub/whereExists` 미구현 |
| **UNION** | ❌ | |
| **`orHaving`** | ❌ | |
| **`orWhereBetween`** | ❌ | |
| **`orWhereNotIn`** | ❌ | |
| **`notLike/orNotLike`** | ❌ | |
| **`havingIn/havingNotIn`** | ❌ | |
| **트랜잭션 제어** | ⚠️ | Model.transaction()만, 수동 begin/commit/rollback 없음 |
| **쿼리 캐시** | ❌ | |
| **소프트 삭제** | ❌ | |

---

## 4. 데이터베이스 & 마이그레이션

| CI3 기능 | 상태 | 비고 |
|----------|------|------|
| 다중 연결 | ✅ | `getDB("group")` |
| SQLite/PostgreSQL/MySQL | ✅ | 3어댑터 |
| 마이그레이션 up/down | ✅ | 타임스탬프 파일명 |
| 롤백 | ✅ | `--steps=N` |
| 시드 | ✅ | `--files=` 선택 실행 |
| Raw Query | ✅ | `sql\`...\`` + `sql.unsafe()` |
| 테스트 DB 주입 | ✅ | `setDB()/resetDB()` |
| **스키마 빌더** | ❌ | `createTable/addColumn` 등 Fluent API 없음 |
| **마이그레이션 상태** | ❌ | `migrations` 테이블 관리 없음 (롤백이 파일 역순) |
| **DB 포징** | ❌ | 환경별 자동 시드 |
| **리드/라이트 분할** | ❌ | |

---

## 5. 세션

| CI3 기능 | 상태 | 비고 |
|----------|------|------|
| 세션 설정/조회/삭제 | ✅ | `set/get/has/remove` |
| Flash 데이터 | ✅ | `flash/getFlash` |
| 세션 파기 | ✅ | `destroy()` |
| 세션 ID 재생성 | ✅ | `regenerateId()` — 세션 고정 방어 |
| File 드라이버 | ✅ | `FileSession` |
| Memory 드라이버 | ✅ | `MemorySession` |
| Redis 드라이버 | ✅ | `RedisSession` |
| SessionDriver 인터페이스 | ✅ | 교체 가능 |
| **데이터베이스 드라이버** | ❌ | CI3 `sess_driver = database` |
| **세션 만료 자동 정리** | ⚠️ | File은 GC 있으나 자동 실행 불확실 |
| **임시 데이터 (tempdata)** | ❌ | CI3 `mark_as_temp()` |

---

## 6. 보안

| CI3 기능 | 상태 | 비고 |
|----------|------|------|
| CSRF (Double Submit Cookie) | ✅ | `Bun.CSRF.generate/verify` |
| XSS 방어 (htmlspecialchars) | ✅ | 템플릿 `{{ }}` 자동 이스케이프 |
| CORS | ✅ | 오리진/메서드/크리덴셜 제어 |
| Rate Limiting | ✅ | 슬라이딩 윈도우 + trustProxy |
| 업로드 검증 | ✅ | 위험확장자/MIME/크기/경로순회 |
| SQL 인젝션 방어 | ✅ | `validateColumnName()` + 파라미터 바인딩 |
| 쿠키 보안 | ✅ | HttpOnly/Secure/SameSite |
| 세션 고정 방어 | ✅ | `regenerateId()` |
| 타이밍 공격 방어 | ✅ | Auth 더미 해시 검증 |
| **Encryption** | ⚠️ | `crypto.ts` 있으나 CI3 `$this->encryption` 수준 아님 |
| **Content Security Policy** | ❌ | CSP 헤더 미들웨어 없음 |
| **Security headers** | ❌ | X-Frame-Options, X-Content-Type-Options 등 일괄 적용 없음 |

---

## 7. 템플릿 / 뷰

| CI3 기능 | 상태 | 비고 |
|----------|------|------|
| `{{ expr }}` 이스케이프 출력 | ✅ | |
| `{{{ expr }}}` raw 출력 | ✅ | |
| `<?= expr ?>` raw 출력 | ✅ | PHP 친화적 |
| `<? code ?>` 제어문 | ✅ | |
| `??` null 병합 | ✅ | |
| 슬롯 시스템 | ✅ | `<!-- slot:name -->...<!-- endslot -->` |
| 레이아웃 | ✅ | `<!-- layout:name -->` |
| include() | ✅ | 재귀 + 추가 데이터 |
| 템플릿 캐시 | ✅ | `clearTemplateCache()` |
| **헬퍼 함수** | ⚠️ | 내장 함수 한정 (date, upper 등) |
| **파셜 (partials/)** | ❌ | 디렉토리 미생성 |
| **컴포넌트** | ❌ | 재사용 UI 컴포넌트 없음 |
| **조건부 렌더링** | ⚠️ | `<? if ?>` 가능하나 편의 헬퍼 없음 |
| **블레이드식 @문법** | ❌ | 의도적 배제 (PHP 친화적 설계) |

---

## 8. CLI (spark / igniter)

| CI3 기능 | 상태 | 비고 |
|----------|------|------|
| `serve` | ✅ | Bun.serve 기반 |
| `make:controller` | ✅ | |
| `make:model` | ✅ | |
| `make:view` | ✅ | 슬롯+CSRF 포함 |
| `make:migration` | ✅ | |
| `make:middleware` | ✅ | |
| `make:scaffold` | ✅ | CRUD 일괄 생성 |
| `make:helper/library` | ✅ | |
| `migrate / migrate:rollback` | ✅ | |
| `db:seed` | ✅ | |
| `listroutes` | ✅ | |
| `repl` | ✅ | |
| `routegen` | ✅ | |
| **`make:command`** | ❌ | 커스텀 CLI 명령 생성기 |
| **`migrate:status`** | ❌ | 적용/미적용 상태 표시 |
| **`migrate:fresh`** | ❌ | DB 초기화 + 재마이그레이션 |
| **`db:create/drop`** | ❌ | |
| **환경 설정** | ❌ | `ignite env production` |

---

## 9. 헬퍼 (CI3 21개 헬퍼 비교)

| CI3 헬퍼 | 상태 | BunIgniter 구현 |
|----------|------|-----------------|
| **URL Helper** | ✅ | `siteUrl/baselUrl/currentUrl/redirect` |
| **String Helper** | ⚠️ | `slug/truncate/escapeHtml` — CI3 대비 빈약 |
| **Date Helper** | ⚠️ | `formatDate/timeAgo` — `now()/mdate()` 없음 |
| **Array Helper** | ❌ | `element()/random_element()` 없음 |
| **Form Helper** | ❌ | `form_open/form_close/form_input/form_dropdown` 없음 |
| **HTML Helper** | ❌ | `anchor/img/heading` 없음 |
| **Inflector Helper** | ❌ | `singular/plural/camelize` 없음 |
| **Number Helper** | ⚠️ | `formatNumber/formatCurrency` — `byte_format()` 없음 |
| **Text Helper** | ❌ | `word_limiter/character_limiter/ellipsis` 없음 |
| **Typography Helper** | ❌ | `auto_typography()` 없음 |
| **Security Helper** | ⚠️ | CSRF 헬퍼만 — `do_hash/strip_image_tags` 없음 |
| **File Helper** | ❌ | `write_file/delete_file/get_filenames` 없음 |
| **Directory Helper** | ❌ | `directory_map()` 없음 |
| **Download Helper** | ❌ | `force_download()` 없음 |
| **Cookie Helper** | ✅ | `getCookie/getCookies/setCookie/deleteCookie` |
| **Language Helper** | ❌ | 다국어 시스템 없음 |
| **Path Helper** | ❌ | `set_realpath()` 없음 |
| **Smiley Helper** | ❌ | (구식, 불필요) |
| **XML Helper** | ❌ | (구식, 불필요) |
| **CAPTCHA Helper** | ❌ | |
| **Profiling Helper** | ❌ | Benchmark/Profiler 없음 |

---

## 10. 라이브러리

| CI3 라이브러리 | 상태 | 비고 |
|----------------|------|------|
| **Auth** | ✅ | 세션 기반 + bcrypt (CI3에는 내장 없음) |
| **Email** | ✅ | SMTP/Sendmail/Log 3드라이버 |
| **Cache** | ✅ | Memory/File/Redis + `remember()` |
| **Upload** | ✅ | 단일/다중 + 보안 검증 |
| **Validation** | ✅ | 17개 규칙 + 커스텀 메시지 |
| **Logger** | ✅ | 5레벨 + 파일 회전 |
| **Pagination** | ✅ | HTML 생성 + QueryBuilder 통합 |
| **Image** | ✅ | 리사이즈/크롭/포맷 변환 |
| **Crypto** | ✅ | Bun.Crypto 내장 |
| **Archive** | ✅ | ZIP/TAR/GZ |
| **Dashboard** | ✅ | 관리 대시보드 |
| **Audit Log** | ✅ | 감사 로그 |
| **Shell** | ✅ | Bun.$ 기반 |
| **Form Validation** | ✅ | Validator 클래스로 통합 |
| **Encryption** | ⚠️ | crypto.ts 있으나 CI3 `$this->encryption` 수준 아님 |
| **User Agent** | ❌ | 브라우저/봇/모바일 감지 없음 |
| **Table** | ❌ | HTML 테이블 자동 생성 없음 |
| **Calendar** | ❌ | |
| **Cart** | ❌ | |
| **Trackback** | ❌ | (구식) |
| **XML-RPC** | ❌ | (구식) |
| **FTP** | ❌ | |
| **Zip** | ⚠️ | Archive로 부분 대체 |
| **Javascript** | ❌ | (구식) |
| **Unit Test** | ⚠️ | Bun:test 사용, CI3 스타일 래퍼 없음 |
| **Profiler** | ❌ | 벤치마크/쿼리 프로파일링 없음 |

---

## 11. BunIgniter 확장 기능 (CI3에 없음)

| 기능 | 상태 | 비고 |
|------|------|------|
| **Queue** | ✅ | 메모리/Redis/데이터베이스 드라이버 |
| **Broadcast Queue** | ✅ | 이벤트 브로드캐스트 |
| **SSE** | ✅ | Server-Sent Events |
| **WebSocket** | ✅ | Bun.serve 웹소켓 |
| **Scheduler** | ✅ | Cron 표현식 + 작업 스케줄링 |
| **Worker Pool** | ✅ | Bun.Worker 기반 병렬 처리 |
| **Distributed Lock** | ✅ | Redis/파일 기반 분산 락 |
| **OpenAPI** | ✅ | Swagger 문서 자동 생성 |
| **Route Model Binding** | ✅ | 자동 모델 주입 |
| **REPL** | ✅ | 대화형 콘솔 |

---

## 12. 문서 & 테스트

| 항목 | 상태 | 비고 |
|------|------|------|
| 가이드 문서 | ✅ 37개 | 거의 모든 기능에 문서 존재 |
| API 레퍼런스 | ❌ | TSDoc은 있으나 별도 API 문서 없음 |
| 예제 앱 (Blog) | ✅ | CRUD + Auth + API |
| 단위 테스트 | ✅ 435개 | 보안/QueryBuilder/헬퍼 등 |
| E2E 테스트 | ❌ | HTTP 요청/응답 통합 테스트 없음 |
| 퍼포먼스 벤치마크 | ❌ | |
| 마이그레이션 가이드 | ❌ | CI3 → BunIgniter 변환 가이드 없음 |

---

## 🎯 구현 로드맵 (우선순위 순)

### 🔴 High Priority (핵심 기능 갭)

체크박스로 관리. 완료 시 `[x]` 표시.

#### H-1. Form 헬퍼

- [ ] `form_open(action, attributes, hidden)` — 폼 시작 + CSRF 자동 삽입
- [ ] `form_close()` — 폼 종료
- [ ] `form_input(name, value, attributes)` — 텍스트 입력
- [ ] `form_password(name, value, attributes)`
- [ ] `form_email(name, value, attributes)`
- [ ] `form_textarea(name, value, attributes)`
- [ ] `form_hidden(name, value)`
- [ ] `form_checkbox(name, value, checked, attributes)`
- [ ] `form_radio(name, value, checked, attributes)`
- [ ] `form_dropdown(name, options, selected, attributes)` — 셀렉트 박스
- [ ] `form_multiselect(name, options, selected, attributes)`
- [ ] `form_upload(name, attributes)`
- [ ] `form_label(label, for, attributes)`
- [ ] `form_button(name, content, attributes)`
- [ ] `form_submit(name, value, attributes)`
- [ ] `form_reset(name, value, attributes)`
- [ ] `form_error(field, prefix, suffix)` — 검증 에러 표시
- [ ] `set_value(field, default)` — 재입력 값 유지
- [ ] `set_select(field, value, default)`
- [ ] `set_checkbox(field, value, default)`
- [ ] 파일: `system/helpers/form_helper.ts`
- [ ] 테스트: `tests/form_helper_test.ts`
- [ ] 문서: `docs/user-guide/helpers.md` 업데이트
- **이유**: CI3에서 가장 많이 사용하는 헬퍼. 폼 작성 필수
- **참고**: CI3 `form_helper.php` 참조

#### H-2. E2E/통합 테스트 인프라

- [ ] `system/core/test_helper.ts` 확장 — HTTP 요청 헬퍼
- [ ] `createTestApp()` — 테스트용 앱 부트스트랩
- [ ] `httpRequest(method, path, options)` — 라우트 테스트
- [ ] `assertResponseStatus(response, status)`
- [ ] `assertResponseJson(response, expected)`
- [ ] `assertRedirect(response, location)`
- [ ] Blog 앱 E2E 테스트 작성
  - [ ] 홈페이지 로드
  - [ ] 포스트 목록/상세
  - [ ] 로그인/로그아웃
  - [ ] CRUD (생성/수정/삭제)
  - [ ] CSRF 검증
  - [ ] 404/405 응답
- [ ] 파일: `tests/e2e_test.ts`, `tests/integration_test.ts`
- **이유**: HTTP 요청→응답 전체 흐름 검증 불가. 회귀 방지

#### H-3. 마이그레이션 상태 추적 (`migrations` 테이블)

- [ ] `migrations` 테이블 자동 생성
- [ ] 마이그레이션 실행 시 기록 저장 (filename, batch, executed_at)
- [ ] `migrate:status` 명령 — 적용/미적용 목록 표시
- [ ] 롤백 시 배치 단위로 삭제
- [ ] 파일: `database/migrate.ts` 수정, `cli/commands/migratestatus.ts` 신규
- [ ] 테스트: 마이그레이션 실행/롤백/상태 조회
- **이유**: 현재 롤백이 파일 역순으로만 동작. 배치 관리 필요

#### H-4. 404 커스텀 핸들러

- [ ] `Router.notFound(handler)` 메서드 추가
- [ ] 설정에서 커스텀 404 뷰 지정 (`app.config.notFoundView`)
- [ ] JSON 요청 시 JSON 에러 응답
- [ ] HTML 요청 시 커스텀 뷰 렌더링
- [ ] 파일: `system/core/router.ts` 수정
- [ ] 테스트: 404 응답 검증
- **이유**: 현재 하드코딩 HTML. 커스터마이징 불가

#### H-5. Security 헤더 미들웨어

- [ ] `securityHeadersMiddleware` — 일괄 보안 헤더 적용
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` 또는 `SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`
  - `Strict-Transport-Security` (HTTPS)
- [ ] CSP(Content Security Policy) 미들웨어
- [ ] 파일: `system/core/security_headers.ts` 신규
- [ ] 테스트: 헤더 존재 검증
- [ ] 문서: `docs/user-guide/security.md` 신규
- **이유**: 브라우저 보안 헤더 일괄 적용. XSS/클릭재킹 방어

---

### 🟡 Medium Priority (CI3 패리티)

#### M-1. HTML 헬퍼

- [ ] `anchor(url, text, attributes)` — `<a>` 태그
- [ ] `anchorPopup(url, text, attributes)`
- [ ] `mailto(email, text, attributes)`
- [ ] `img(src, attributes)` — `<img>` 태그
- [ ] `heading(text, level, attributes)` — `<h1>`~`<h6>`
- [ ] `ul(items, attributes)` — `<ul>` 목록
- [ ] `ol(items, attributes)` — `<ol>` 목록
- [ ] `br(count)` — `<br>`
- [ ] `nbsp(count)` — `&nbsp;`
- [ ] `meta(name, content, type)` — `<meta>` 태그
- [ ] 파일: `system/helpers/html_helper.ts`
- [ ] 테스트: `tests/html_helper_test.ts`
- **이유**: 뷰에서 자주 사용. 폼 헬퍼와 함께 필수

#### M-2. Text 헬퍼

- [ ] `wordLimiter(str, limit, suffix)` — 단어 수 제한
- [ ] `characterLimiter(str, limit, suffix)` — 글자 수 제한
- [ ] `asciiOnly(str)` — ASCII만 추출
- [ ] `convertAccentedChars(str)` — 악센트 제거
- [ ] `censoredWords(str, censored)` — 욕설 필터
- [ ] `highlightCode(str)` — 코드 하이라이트
- [ ] `highlightPhrase(str, phrase)` — 구문 하이라이트
- [ ] `wordWrap(str, limit)` — 줄바꿈
- [ ] `ellipsize(str, maxLength, position)` — 말줄임
- [ ] `stripQuotes(str)` — 따옴표 제거
- [ ] 파일: `system/helpers/text_helper.ts`
- [ ] 테스트: `tests/text_helper_test.ts`
- **이유**: 블로그/게시판 필수 (요약, 말줄임 등)

#### M-3. Inflector 헬퍼

- [ ] `singular(word)` — 복수→단수
- [ ] `plural(word)` — 단수→복수
- [ ] `camelize(word)`
- [ ] `underscore(word)`
- [ ] `humanize(word)`
- [ ] `pascalize(word)`
- [ ] `slugify(word)` (기존 slug 개선)
- [ ] 파일: `system/helpers/inflector_helper.ts`
- [ ] 테스트: `tests/inflector_helper_test.ts`
- **이유**: CLI 생성기 + 모델명 변환 (User ↔ users)

#### M-4. QueryBuilder 서브쿼리

- [ ] `whereSub(callback)` — 서브쿼리 WHERE
- [ ] `whereExists(callback)` — EXISTS 서브쿼리
- [ ] `whereNotExists(callback)`
- [ ] `fromSub(callback, alias)` — FROM 서브쿼리
- [ ] `selectSub(callback, alias)` — SELECT 서브쿼리
- [ ] `union(callback)` — UNION
- [ ] `unionAll(callback)` — UNION ALL
- [ ] 어댑터별 방언 처리
- [ ] 테스트: 서브쿼리 케이스
- **이유**: 복잡한 쿼리 (예: 최신 댓글이 있는 포스트)

#### M-5. 소프트 삭제 (Soft Deletes)

- [ ] `Model.softDelete = true` 옵션
- [ ] `deletedAt` 컬럼 자동 처리
- [ ] `delete()` → `UPDATE SET deleted_at = NOW()` (soft)
- [ ] `forceDelete()` — 실제 DELETE (hard)
- [ ] `withTrashed()` — 삭제된 것도 포함 조회
- [ ] `onlyTrashed()` — 삭제된 것만 조회
- [ ] `restore()` — 삭제 복구
- [ ] QueryBuilder에 `whereNull(deleted_at)` 자동 적용
- [ ] 테스트: soft/hard delete, restore
- **이유**: `deleted_at` 패턴은 거의 표준

#### M-6. 파셜 디렉토리 및 컨벤션

- [ ] `app/views/partials/` 디렉토리 생성
- [ ] 예제 파셜: `header.html`, `footer.html`, `sidebar.html`, `nav.html`
- [ ] 문서에 파셜 사용 예제 추가
- [ ] Blog 앱에 파셜 적용
- **이유**: 문서에 언급되나 미생성. 재사용성 향상

#### M-7. 스키마 빌더 (Fluent 마이그레이션)

- [ ] `Schema.create(table, callback)` — 테이블 생성
- [ ] `Schema.table(table, callback)` — 테이블 수정
- [ ] `Schema.drop(table)` — 테이블 삭제
- [ ] `Schema.dropIfExists(table)`
- [ ] 컬럼 타입: `increments/integer/string/text/boolean/dateTime/json/binary`
- [ ] 컬럼 제약: `nullable/default/unique/primary/foreign/index`
- [ ] 파일: `system/core/schema.ts` 신규
- [ ] 마이그레이션 파일에서 사용 가능
- [ ] 테스트: 스키마 생성/수정/삭제
- **이유**: 마이그레이션을 Fluent API로 작성 (Laravel 스타일)

#### M-8. `migrate:fresh` 명령

- [ ] 모든 테이블 DROP 후 마이그레이션 재실행
- [ ] `--seed` 옵션 — 마이그레이션 후 시드 자동 실행
- [ ] `--force` 옵션 — 프로덕션 확인 프롬프트 스킵
- [ ] 파일: `cli/commands/migratefresh.ts` 신규
- [ ] 레지스트리 등록
- **이유**: 개발 중 DB 초기화 자주 필요

#### M-9. HTTP 메서드 오버라이드

- [ ] `_method` 폼 필드로 PUT/DELETE/PATCH 지원
- [ ] `X-HTTP-Method-Override` 헤더 지원
- [ ] 미들웨어로 구현
- [ ] 파일: `system/core/method_override.ts` 신규
- [ ] 테스트: 폼/헤더 오버라이드
- **이유**: 브라우저 폼은 GET/POST만 지원. PUT/DELETE 사용

#### M-10. QueryBuilder 추가 WHERE 변형

- [ ] `orHaving(column, value)`
- [ ] `orWhereBetween(column, low, high)`
- [ ] `orWhereNotIn(column, values)`
- [ ] `notLike(column, value, side)`
- [ ] `orNotLike(column, value, side)`
- [ ] `havingIn(column, values)` / `havingNotIn(column, values)`
- [ ] 테스트: 각 변형 케이스
- **이유**: CI3 Active Record 완전 패리티

#### M-11. 수동 트랜잭션 제어

- [ ] `QueryBuilder.beginTransaction()`
- [ ] `QueryBuilder.commit()`
- [ ] `QueryBuilder.rollback()`
- [ ] `QueryBuilder.begin()` (이름있는 세이브포인트)
- [ ] 테스트: 수동 begin/commit/rollback
- **이유**: Model.transaction()만으로는 부족. 세밀한 제어 필요

#### M-12. Array 헬퍼

- [ ] `element(item, array, default)` — 안전한 배열 접근
- [ ] `elements(items, array, default)` — 복수 키 조회
- [ ] `randomElement(array)` — 랜덤 요소
- [ ] 파일: `system/helpers/array_helper.ts`
- [ ] 테스트: `tests/array_helper_test.ts`
- **이유**: CI3 호환성

---

### 🟢 Low Priority (있으면 좋은 기능)

#### L-1. User Agent 라이브러리

- [ ] 브라우저 감지 (Chrome, Firefox, Safari, Edge 등)
- [ ] 모바일 감지
- [ ] 봇 감지
- [ ] OS 감지
- [ ] 파일: `system/core/user_agent.ts` 신규
- [ ] 테스트: 다양한 UA 문자열
- **이유**: 모바일 대응, 봇 필터링

#### L-2. 다국어 시스템 (i18n)

- [ ] `app/lang/ko/app.ts`, `app/lang/en/app.ts` 언어 파일
- [ ] `lang(key, params)` 헬퍼 함수
- [ ] 템플릿에서 `{{ lang("welcome") }}` 사용
- [ ] 브라우저 언어 자동 감지
- [ ] 세션/쿠키로 언어 전환
- [ ] 파일: `system/core/i18n.ts` 신규
- [ ] 테스트: 다국어 로드/전환
- **이유**: 한국어 기반이라 우선순위 낮으나 확장성

#### L-3. Auto-loading

- [ ] `app/config/autoload.ts` — 자동 로드 설정
- [ ] 라이브러리/헬퍼/모델 자동 로드
- [ ] 컨트롤러에서 `$this->library` 대신 전역 접근
- [ ] 파일: `system/core/autoload.ts` 신규
- **이유**: CI3 호환성. 매번 import 생략

#### L-4. 프로파일러

- [ ] 벤치마크 포인트 (시간 측정)
- [ ] 실행된 쿼리 목록
- [ ] 메모리 사용량
- [ ] 요청/세션 데이터
- [ ] 개발 환경에서 하단에 표시
- [ ] 파일: `system/core/profiler.ts` 신규
- **이유**: 디버그/성능 분석

#### L-5. 라우트 네이밍

- [ ] `router.get("/users/:id", ctrl, "show").name("users.show")`
- [ ] `routeUrl("users.show", { id: 1 })` → `/users/1`
- [ ] 역방향 라우팅
- [ ] 파일: `system/core/router.ts` 수정
- **이유**: URL 하드코딩 방지

#### L-6. CI3 마이그레이션 가이드

- [ ] `docs/migration/from-codeigniter3.md` 신규
- [ ] PHP → TS 변환 표 (컨트롤러/모델/뷰)
- [ ] CI3 함수 ↔ BunIgniter 함수 매핑
- [ ] 단계별 마이그레이션 가이드
- [ ] 실제 변환 예제
- **이유**: CI3 사용자 온보딩

#### L-7. API 레퍼런스 문서

- [ ] TSDoc 기반 API 문서 자동 생성
- [ ] TypeDoc 또는 유사 도구 통합
- [ ] `docs/api/` 디렉토리
- **이유**: TSDoc은 있으나 별도 API 문서 없음

#### L-8. File Helper

- [ ] `writeFile(path, data)`
- [ ] `deleteFile(path)`
- [ ] `getFilenames(dir, includePath)`
- [ ] `getDirFileInfo(dir)`
- [ ] `getFileInfo(path)`
- [ ] 파일: `system/helpers/file_helper.ts`
- **이유**: CI3 호환성. 파일 작업 편의

#### L-9. Download Helper

- [ ] `forceDownload(filename, data)`
- [ ] `downloadResponse(filePath)` — 파일 다운로드 응답
- [ ] 파일: `system/helpers/download_helper.ts`
- **이유**: 파일 다운로드 기능

#### L-10. CAPTCHA 헬퍼

- [ ] 이미지 CAPTCHA 생성
- [ ] 검증 로직
- [ ] 파일: `system/helpers/captcha_helper.ts`
- **이유**: 스팸 방지 (선택적)

---

## 📋 구현 체크리스트 요약

### High Priority (5개)

- [ ] H-1. Form 헬퍼
- [ ] H-2. E2E/통합 테스트 인프라
- [ ] H-3. 마이그레이션 상태 추적
- [ ] H-4. 404 커스텀 핸들러
- [ ] H-5. Security 헤더 미들웨어

### Medium Priority (12개)

- [ ] M-1. HTML 헬퍼
- [ ] M-2. Text 헬퍼
- [ ] M-3. Inflector 헬퍼
- [ ] M-4. QueryBuilder 서브쿼리
- [ ] M-5. 소프트 삭제 (Soft Deletes)
- [ ] M-6. 파셜 디렉토리 및 컨벤션
- [ ] M-7. 스키마 빌더 (Fluent 마이그레이션)
- [ ] M-8. `migrate:fresh` 명령
- [ ] M-9. HTTP 메서드 오버라이드
- [ ] M-10. QueryBuilder 추가 WHERE 변형
- [ ] M-11. 수동 트랜잭션 제어
- [ ] M-12. Array 헬퍼

### Low Priority (10개)

- [ ] L-1. User Agent 라이브러리
- [ ] L-2. 다국어 시스템 (i18n)
- [ ] L-3. Auto-loading
- [ ] L-4. 프로파일러
- [ ] L-5. 라우트 네이밍
- [ ] L-6. CI3 마이그레이션 가이드
- [ ] L-7. API 레퍼런스 문서
- [ ] L-8. File Helper
- [ ] L-9. Download Helper
- [ ] L-10. CAPTCHA 헬퍼

**총 27개 항목**

---

## 📌 진행 상황 기록

구현 완료 시 아래에 기록:

| 날짜 | 항목 | 커밋 | 비고 |
|------|------|------|------|
| 2026-07-05 | (시작) | e2da8d0 | 분석 완료, 로드맵 작성 |

---

## 🔗 관련 파일

- 코어: `system/core/*.ts` (48개 파일)
- 헬퍼: `system/helpers/index.ts` (현재 1개 파일)
- CLI: `cli/commands/*.ts` (15개 명령)
- 테스트: `tests/*.ts` (19개 파일, 435 tests)
- 문서: `docs/user-guide/*.md` (37개 파일)
- 예제: `examples/blog/` (Blog 앱)
