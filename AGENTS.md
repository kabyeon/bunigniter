# AGENTS.md - BunIgniter 기여자 가이드

이 파일은 AI 에이전트와 인간 개발자 모두가 BunIgniter 프레임워크를 이해하고 기여할 수 있도록 작성되었습니다.

---

## 프로젝트 개요

BunIgniter는 CodeIgniter 3의 MVC 패턴을 Bun 런타임 환경에서 재구현한 풀스택 웹 프레임워크입니다.

### 핵심 설계 원칙

1. **CodeIgniter 3 호환성**: CI3 개발자가 직관적으로 이해할 수 있는 API 구조
2. **Bun 네이티브**: Bun SQL, Bun.file, Bun.password 등 Bun 런타임 기능을 최우선으로 활용
3. **Elysia 래핑**: HTTP 레이어는 Elysia 2.0을 래핑하여 라우팅/미들웨어 처리
4. **Rendu 템플릿**: PHP 스타일 `<? ?>` 문법으로 서버 사이드 렌더링
5. **CLI 스캐폴딩**: AdonisJS Ace 스타일로 MVC 보일러플레이트 자동 생성
6. **소문자 파일명**: 모든 TypeScript 파일은 `snake_case` 소문자 규칙 사용

---

## 아키텍처

### 레이어 구조

```
요청 → Elysia (HTTP) → Router → [글로벌 미들웨어] → [라우트 미들웨어] → Controller → Model → Bun SQL
                                                                                   ↓
                                                                                View (Rendu) → HTML 응답
                                                                                    ↓
                                                                              JSON 응답 (API)
```

### 미들웨어 파이프라인

```
요청 → 글로벌 미들웨어 (router.use) → 라우트 미들웨어 (router.resource 3번째 인자)
           ↓ next()                     ↓ next()
         통과/차단                     통과/차단
                                          ↓
                                     Controller 핸들러
```

- `next()` 를 호출하면 다음 미들웨어로 진행
- `next()` 를 호출하지 않고 `Response` 를 반환하면 파이프라인 중단 (요청 차단)
- `runMiddlewarePipeline()` 이 파이프라인을 실행

### 핵심 흐름

1. **Bootstrap** (`system/core/bootstrap.ts`): Elysia 앱 생성, 정적 파일 서비스, 에러 핸들링, 라우트 등록, 로거 초기화, 서버 시작
2. **Router** (`system/core/router.ts`): 사용자 정의 라우트를 Elysia 라우트로 변환. 글로벌+라우트 미들웨어 파이프라인 실행 후 `controller.method(ctx)` 호출
3. **Controller** (`system/core/controller.ts`): `Context` 객체를 받아 비즈니스 로직 처리. `this.view()`, `this.json()`, `this.redirect()` 로 응답
4. **Model** (`system/core/model.ts`): Bun SQL tagged template literal 기반 CRUD. 제네릭 타입으로 타입 안전성 제공
5. **View** (`system/core/view.ts`): Rendu 템플릿 컴파일 + 레이아웃 시스템. `<!-- layout:name -->` 주석으로 자동 레이아웃 결합

---

## 디렉토리 책임

### `system/` - 프레임워크 코어 (사용자 수정 금지)

| 파일 | 책임 | 외부 의존성 |
|------|------|------------|
| `core/bootstrap.ts` | 서버 시작, Elysia 설정, 에러 핸들링, 로거 연동 | elysia, config.ts, database.ts, logger.ts |
| `core/config.ts` | `app/config/` 에서 설정 파일 로드, 캐싱 | 없음 |
| `core/controller.ts` | 기본 컨트롤러 클래스, `view()`/`json()`/`redirect()` | view.ts |
| `core/database.ts` | Bun SQL 연결 관리, 다중 그룹 지원 | bun (SQL), config.ts |
| `core/model.ts` | 기본 모델 클래스, CRUD/페이지네이션/트랜잭션 | database.ts |
| `core/router.ts` | 라우트 정의 → Elysia 라우트 변환, `resource()`/`group()`, 미들웨어 파이프라인 | elysia, controller.ts, middleware.ts |
| `core/view.ts` | Rendu 템플릿 컴파일, 레이아웃 결합, 캐싱 | rendu |
| `core/middleware.ts` | 미들웨어 파이프라인 (`runMiddlewarePipeline`), `MiddlewareContext` 타입 | 없음 |
| `core/session.ts` | 인메모리 쿠키 기반 세션, Flash 데이터 | 없음 |
| `core/file_session.ts` | 파일 기반 세션 (`storage/sessions/`), GC, Flash 데이터 | 없음 |
| `core/input.ts` | 요청 입력 헬퍼 (POST/GET/헤더/IP) | 없음 |
| `core/csrf.ts` | CSRF 토큰 생성/검증, `csrfMiddleware`, `csrfField`, `csrfMeta` | 없음 |
| `core/validator.ts` | `Validator.check`, `validate` 함수, 20+ 검증 규칙 | 없음 |
| `core/auth.ts` | `Auth` 클래스 (bcrypt), `authGuard`/`guestGuard` 미들웨어 | file_session.ts, database.ts |
| `core/upload.ts` | `Upload.save`/`saveMany`/`delete`, MIME/확장자/크기 검증 | 없음 |
| `core/pagination.ts` | `paginationHtml`/`Info`/`Meta`, HTML 네비게이션 생성 | 없음 |
| `core/logger.ts` | `Logger` 클래스, 파일+콘솔 출력, 레벨 필터링, 로그 회전 | 없음 |
| `core/test_helper.ts` | `createTestDB`, `testRequest`, `parseJsonResponse` | bun:test |
| `helpers/index.ts` | 전역 헬퍼 (URL, 문자열, 날짜, 통화) | 없음 |

### `app/` - 사용자 애플리케이션

| 디렉토리 | 책임 |
|---------|------|
| `config/` | 앱/DB/라우트 설정 |
| `controllers/` | HTTP 요청 처리 |
| `models/` | 데이터베이스 조작 |
| `views/` | Rendu HTML 템플릿 |
| `views/layout/` | 레이아웃 템플릿 |
| `middleware/` | 미들웨어 |
| `helpers/` | 커스텀 헬퍼 함수 |
| `libraries/` | 커스텀 라이브러리 클래스 |

### `cli/` - CLI 스캐폴딩 시스템

| 파일 | 책임 |
|------|------|
| `index.ts` | CLI 진입점, 명령어 분기 |
| `registry.ts` | 명령어 등록/조회, 도움말 출력 |
| `utils.ts` | 이름 변환 (PascalCase/snake_case/복수형), 파일 생성, 인자 파싱 |
| `commands/makescaffold.ts` | 핵심: Controller + Model + View + Migration 동시 생성. `--api` 플래그 지원 |
| `commands/makecontroller.ts` | 컨트롤러 생성, `--resource` 시 CRUD 메서드 포함 |
| `commands/makemodel.ts` | 모델 생성, `--fields` 로 인터페이스 자동 생성 |
| `commands/makeview.ts` | 뷰 템플릿 생성, `--resource` 시 index/show/create/edit 생성 |
| `commands/makemigration.ts` | 마이그레이션 파일 생성, `create_`/`add_` 접두사 자동 감지 |
| `commands/makemiddleware.ts` | 미들웨어 함수 생성 |
| `commands/makehelper.ts` | 헬퍼 파일 생성 |
| `commands/makelibrary.ts` | 라이브러리 클래스 생성 |
| `commands/dbseed.ts` | `make:seed` (시더 생성) + `db:seed` (시더 실행) |
| `commands/migraterollback.ts` | `migrate:rollback` (마이그레이션 롤백, `--steps`/`--all`) |

### `database/` - 마이그레이션 & 시드

| 파일/디렉토리 | 책임 |
|--------------|------|
| `migrate.ts` | 마이그레이션 실행기. `migrations` 테이블로 실행 추적 |
| `migrations/*.ts` | 개별 마이그레이션. `up()`/`down()` export |
| `seeds/*.ts` | 시드 파일. `run()` export |

### `storage/` - 런타임 저장소

| 디렉토리 | 책임 |
|---------|------|
| `logs/` | 로그 파일 (`app-YYYY-MM-DD.log`) |
| `sessions/` | 파일 기반 세션 (`sess_<uuid>`) |

### `tests/` - 테스트

| 파일 | 대상 |
|------|------|
| `validator_test.ts` | Validator / validate 함수 |
| `upload_test.ts` | Upload.formatFileSize / isImage |
| `pagination_test.ts` | paginationHtml / Info / Meta |
| `helpers_test.ts` | slug, truncate, escapeHtml, formatDate, timeAgo 등 |

---

## 코딩 규칙

### 파일명

- **모든 TypeScript 파일은 소문자 snake_case**: `user_model.ts`, `auth_middleware.ts`
- **뷰 템플릿은 소문자**: `index.html`, `show.html`
- **마이그레이션은 타임스탬프 접두사**: `1783262870269_create_posts_table.ts`
- **시더는 소문자**: `user_seeder.ts`

### 클래스/인터페이스 명명

| 타입 | 명명 규칙 | 예시 |
|------|----------|------|
| Controller 클래스 | `{Name}Controller` | `PostController` |
| Model 클래스 | `{Name}Model` | `PostModel` |
| Interface | `{Name}Interface` | `PostInterface` |
| Middleware 함수 | `{name}Middleware` | `authMiddleware` |
| Library 클래스 | `{Name}Library` | `EmailLibrary` |

### 임포트 경로

```typescript
// 시스템 모듈 - .ts 확장자 포함
import { Controller } from "system/core/controller.ts";
import { Model } from "system/core/model.ts";
import { Router } from "system/core/router.ts";
import { validate } from "system/core/validator.ts";
import { Auth, authGuard } from "system/core/auth.ts";
import { Upload } from "system/core/upload.ts";
import { logger } from "system/core/logger.ts";
import { csrfMiddleware, csrfField } from "system/core/csrf.ts";
import { paginationHtml } from "system/core/pagination.ts";
import { FileSession } from "system/core/file_session.ts";

// 앱 모듈 - .ts 확장자 포함
import userModel from "app/models/user_model.ts";
import authMiddleware from "app/middleware/auth_middleware.ts";
```

### 컨트롤러 패턴

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import resourceModel from "app/models/resource_model.ts";

export class ResourceController extends Controller {
  async index({ request, response }: Context) { /* 목록 */ }
  async show({ request, params, response }: Context) { /* 상세 */ }
  async create({ request, response }: Context) { /* 생성 폼 */ }
  async store({ request, response }: Context) { /* 저장 */ }
  async edit({ request, params, response }: Context) { /* 수정 폼 */ }
  async update({ request, params, response }: Context) { /* 수정 */ }
  async delete({ request, params, response }: Context) { /* 삭제 */ }
}

// default export = 싱글톤 인스턴스
export default new ResourceController();
```

### 모델 패턴

```typescript
import { Model } from "system/core/model.ts";

export interface ResourceInterface {
  id?: number;
  // 필드...
  created_at?: string;
  updated_at?: string;
}

export class ResourceModel extends Model<ResourceInterface> {
  override tableName = "resources";  // 반드시 오버라이드
}

export default new ResourceModel();
```

### 뷰 패턴

```html
<!-- layout:default -->              <!-- 레이아웃 지정 (필수 아님) -->

<h1>{{ title }}</h1>                <!-- 이스케이프 출력 -->

<? for (const item of items) { ?>   <!-- 반복문 -->
  <li>{{ item.name }}</li>
<? } ?>

<? if (condition) { ?>              <!-- 조건문 -->
  <p>참</p>
<? } ?>
```

---

## 기여 시 주의사항

### `system/` 수정 시

- `system/` 은 모든 애플리케이션이 공유하는 코어입니다. 기존 API를 깨는 변경은 피하세요
- 새로운 코어 모듈을 추가할 때는 `system/core/index.ts` 에 export를 추가하세요
- `Model` 클래스에 새 메서드를 추가할 때는 하위 호환성을 유지하세요

### CLI 명령어 추가 시

1. `cli/commands/` 에 새 파일을 생성합니다 (소문자로)
2. `Command` 인터페이스를 구현합니다:

```typescript
import type { Command } from "../registry.ts";
import { createFile, parseArgs } from "../utils.ts";

export const makeSomething: Command = {
  name: "make:something",
  description: "설명",
  usage: "bun run igniter make:something <name>",
  options: [
    { flag: "--option", description: "옵션 설명" },
  ],
  async run(args: string[]): Promise<void> {
    // 구현
  },
};
```

3. `cli/index.ts` 에 등록합니다:

```typescript
import { makeSomething } from "./commands/makesomething.ts";
registry.register("make:something", makeSomething);
```

### 뷰 템플릿 수정 시

- `<!-- layout:name -->` 주석은 반드시 첫 번째 줄에 위치해야 합니다
- 레이아웃의 `{{{ content }}}` 마커는 정규식 `/\{\{\{\s*content\s*\}\}\}/` 으로 매칭됩니다
- 개발 환경에서는 템플릿이 매 요청마다 다시 컴파일됩니다 (캐시 안함)

### 데이터베이스 관련

- `Model` 클래스의 `findWhere()` 는 내부적으로 `sql.unsafe()` 를 사용합니다. SQL Injection 방지를 위해 사용자 입력을 직접 넣지 마세요
- `create()`, `update()` 는 Bun SQL의 `sql(object)` 헬퍼를 사용하여 안전하게 파라미터 바인딩합니다
- SQLite는 동기 실행되지만 API는 `Promise`를 반환합니다. PostgreSQL/MySQL은 비동기입니다

### 마이그레이션 관련

- 마이그레이션 파일명은 반드시 타임스탬프로 시작해야 실행 순서가 보장됩니다
- `up()` 과 `down()` 을 반드시 export하세요
- `migrate.ts` 실행기와 `migraterollback.ts` 은 각각 별도 SQLite 연결을 생성합니다
- 시더는 `run()` 을 export하세요

### 인증 관련

- `Auth` 클래스는 `FileSession` 을 사용합니다 (인메모리 `Session` 아님)
- 비밀번호 해싱은 Bun 내장 `Bun.password.hash()`/`verify()` 를 사용합니다 (bcrypt)
- `authGuard` 는 로그인하지 않은 사용자를 `/login` 으로 리다이렉트합니다

### CSRF 관련

- CSRF 토큰은 쿠키(`csrf_token`)에 저장됩니다
- 클라이언트는 폼 hidden 필드, 헤더(`X-CSRF-Token`), 쿼리 파라미터 중 하나로 토큰을 전송합니다
- GET/HEAD/OPTIONS 요청은 검증에서 제외됩니다

### 로깅 관련

- 로그 파일은 `storage/logs/app-YYYY-MM-DD.log` 에 저장됩니다
- 개발 환경: debug 이상 출력, 프로덕션: info 이상 출력
- 10MB 초과 시 로그 회전, 최대 30개 파일 유지

---

## 테스트

### 실행

```bash
# 전체 테스트
bun test

# 워치 모드
bun test --watch

# 특정 파일
bun test tests/validator_test.ts
```

### 테스트 작성 패턴

```typescript
import { describe, test, expect } from "bun:test";

describe("기능 이름", () => {
  test("세부 동작", () => {
    expect(실제값).toBe(기대값);
  });
});
```

### 테스트 헬퍼 활용

```typescript
import { createTestDB, testRequest, parseJsonResponse } from "../system/core/test_helper.ts";

// 인메모리 DB로 DB 관련 테스트
const db = await createTestDB();
await db`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`;
const result = await db`SELECT * FROM users`;
await db.close();

// HTTP 요청 테스트 (서버 실행 중일 때)
const res = await testRequest("POST", "/users", { name: "Alice" });
const json = await parseJsonResponse(res);
```

### 테스트 가이드라인

- `tests/` 디렉토리에 `*_test.ts` 형식으로 파일을 생성합니다
- 외부 서비스 의존성이 없는 단위 테스트를 우선합니다
- DB가 필요한 테스트는 `createTestDB()` 를 사용하세요 (인메모리 SQLite)
- HTTP 테스트는 서버가 실행 중일 때만 `testRequest()` 를 사용할 수 있습니다

---

## 알려진 제한사항

1. **인메모리 세션**: `Session` 클래스는 서버 재시작 시 초기화됩니다. 영속이 필요하면 `FileSession` 을 사용하세요
2. **Auth + FileSession**: `Auth` 클래스는 `FileSession` 에 의존합니다. 향후 세션 드라이버 추상화 필요
3. **CSRF 쿠키**: CSRF 토큰이 HttpOnly 쿠키에 저장되어 JavaScript에서 읽을 수 없습니다. AJAX 요청 시 헤더 방식 대신 폼 hidden 필드 방식 권장
4. **이메일/캐시**: 라이브러리 스캐폴딩만 제공됩니다. 실제 구현은 사용자가 해야 합니다
5. **WebSocket**: 아직 지원하지 않습니다
6. **파일 감시**: `bun run --hot` 사용 시 `app/config/routes.ts` 변경이 자동 반영되지 않을 수 있습니다

---

## 개발 로드맵

기여 환영 영역:

- [ ] 세션 드라이버 추상화 (인터페이스 기반, FileSession/RedisSession 교체 가능)
- [ ] CSRF 토큰을 Double Submit Cookie 방식으로 개선
- [ ] 이메일 발송 라이브러리
- [ ] 캐시 라이브러리 (인메모리 + 파일)
- [ ] WebSocket 지원
- [ ] `make:scaffold` 의 `--api` 시 API 전용 라우트 그룹 자동 등록
- [ ] 라우트 모델 바인딩 (`router.get("/users/:user", controller, "show")` 시 자동 조회)
- [ ] CORS 미들웨어
- [ ] Rate Limiting 미들웨어
- [ ] OpenAPI / Swagger 문서 자동 생성
- [ ] 통합 테스트 (서버 기동 + HTTP 요청 자동화)
- [ ] Docker 지원
- [ ] CI/CD 파이프라인
