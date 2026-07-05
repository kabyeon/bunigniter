# AGENTS.md - BunIgniter 기여자 가이드

이 파일은 AI 에이전트와 인간 개발자 모두가 BunIgniter 프레임워크를 이해하고 기여할 수 있도록 작성되었습니다.

---

## 프로젝트 개요

BunIgniter는 CodeIgniter 3의 MVC 패턴을 Bun 런타임 환경에서 재구현한 풀스택 웹 프레임워크입니다.

### 핵심 설계 원칙

1. **CodeIgniter 3 호환성**: CI3 개발자가 직관적으로 이해할 수 있는 API 구조
2. **Bun 네이티브**: Bun SQL, Bun.file 등 Bun 런타임 기능을 최우선으로 활용
3. **Elysia 래핑**: HTTP 레이어는 Elysia 2.0을 래핑하여 라우팅/미들웨어 처리
4. **Rendu 템플릿**: PHP 스타일 `<? ?>` 문법으로 서버 사이드 렌더링
5. **CLI 스캐폴딩**: AdonisJS Ace 스타일로 MVC 보일러플레이트 자동 생성
6. **소문자 파일명**: 모든 TypeScript 파일은 `snake_case` 소문자 규칙 사용

---

## 아키텍처

### 레이어 구조

```
요청 → Elysia (HTTP) → Router → Middleware → Controller → Model → Bun SQL
                                                        ↓
                                                     View (Rendu) → HTML 응답
```

### 핵심 흐름

1. **Bootstrap** (`system/core/bootstrap.ts`): Elysia 앱 생성, 정적 파일 서비스, 에러 핸들링, 라우트 등록, 서버 시작
2. **Router** (`system/core/router.ts`): 사용자 정의 라우트를 Elysia 라우트로 변환. `controller.method(ctx)` 형태로 핸들러 호출
3. **Controller** (`system/core/controller.ts`): `Context` 객체를 받아 비즈니스 로직 처리. `this.view()`, `this.json()`, `this.redirect()` 로 응답
4. **Model** (`system/core/model.ts`): Bun SQL tagged template literal 기반 CRUD. 제네릭 타입으로 타입 안전성 제공
5. **View** (`system/core/view.ts`): Rendu 템플릿 컴파일 + 레이아웃 시스템. `<!-- layout:name -->` 주석으로 자동 레이아웃 결합

---

## 디렉토리 책임

### `system/` - 프레임워크 코어 (사용자 수정 금지)

| 파일 | 책임 | 외부 의존성 |
|------|------|------------|
| `core/bootstrap.ts` | 서버 시작, Elysia 설정, 에러 핸들링 | elysia, config.ts, database.ts |
| `core/config.ts` | `app/config/` 에서 설정 파일 로드, 캐싱 | 없음 |
| `core/controller.ts` | 기본 컨트롤러 클래스, `view()`/`json()`/`redirect()` | view.ts |
| `core/database.ts` | Bun SQL 연결 관리, 다중 그룹 지원 | bun (SQL), config.ts |
| `core/model.ts` | 기본 모델 클래스, CRUD/페이지네이션/트랜잭션 | database.ts |
| `core/router.ts` | 라우트 정의 → Elysia 라우트 변환, `resource()` 지원 | elysia, controller.ts |
| `core/view.ts` | Rendu 템플릿 컴파일, 레이아웃 결합, 캐싱 | rendu |
| `core/middleware.ts` | 미들웨어 파이프라인, `MiddlewareContext` 타입 | 없음 |
| `core/session.ts` | 쿠키 기반 세션, Flash 데이터 | 없음 |
| `core/input.ts` | 요청 입력 헬퍼 (POST/GET/헤더/IP) | 없음 |
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
| `commands/makescaffold.ts` | 핵심: Controller + Model + View + Migration 동시 생성 |
| `commands/makecontroller.ts` | 컨트롤러 생성, `--resource` 시 CRUD 메서드 포함 |
| `commands/makemodel.ts` | 모델 생성, `--fields` 로 인터페이스 자동 생성 |
| `commands/makeview.ts` | 뷰 템플릿 생성, `--resource` 시 index/show/create/edit 생성 |
| `commands/makemigration.ts` | 마이그레이션 파일 생성, `create_`/`add_` 접두사 자동 감지 |
| `commands/makemiddleware.ts` | 미들웨어 함수 생성 |
| `commands/makehelper.ts` | 헬퍼 파일 생성 |
| `commands/makelibrary.ts` | 라이브러리 클래스 생성 |

### `database/` - 마이그레이션

| 파일 | 책임 |
|------|------|
| `migrate.ts` | 마이그레이션 실행기. `migrations` 테이블로 실행 추적 |
| `migrations/*.ts` | 개별 마이그레이션. `up()`/`down()` export |

---

## 코딩 규칙

### 파일명

- **모든 TypeScript 파일은 소문자 snake_case**: `user_model.ts`, `auth_middleware.ts`
- **뷰 템플릿은 소문자**: `index.html`, `show.html`
- **마이그레이션은 타임스탬프 접두사**: `1783262870269_create_posts_table.ts`

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

1. `cli/commands/` 에 새 파일을 생성합니다 (`makecommand.ts` 와 같이 소문자로)
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

1. `cli/index.ts` 에 등록합니다:

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
- `migrate.ts` 실행기는 별도 SQLite 연결을 생성합니다 (`getDB()` 사용 안함)

---

## 테스트 방법

```bash
# 개발 서버 실행
bun run dev

# CLI 명령어 테스트
bun run igniter make:scaffold product --fields=name:string,price:number

# 마이그레이션 테스트
bun run migrate

# 서버 응답 테스트
curl http://localhost:3000/
curl http://localhost:3000/css/style.css
```

---

## 알려진 제한사항

1. **세션**: 현재 인메모리 Map 기반입니다. 서버 재시작 시 세션이 초기화됩니다
2. **CSRF 보호**: 설정에 정의되어 있으나 아직 구현되지 않았습니다
3. **미들웨어 파이프라인**: `router.use()` 로 글로벌 등록은 가능하나, 라우트별 미들웨어 실행 파이프라인이 아직 완전하지 않습니다
4. **파일 업로드**: 아직 헬퍼가 제공되지 않습니다. `request.formData()` 를 직접 사용하세요
5. **페이지네이션 뷰 헬퍼**: `model.paginate()` 데이터는 제공되나, 페이지 네비게이션 UI는 직접 구현해야 합니다
6. **이메일/캐시**: 라이브러리 스캐폴딩만 제공됩니다. 실제 구현은 사용자가 해야 합니다

---

## 개발 로드맵

기여 환영 영역:

- [ ] CSRF 보호 미들웨어 구현
- [ ] 파일 업로드 헬퍼
- [ ] 파일 기반 세션 스토어 (인메모리 대체)
- [ ] 페이지네이션 뷰 헬퍼
- [ ] `make:scaffold` 의 `--api` 플래그 (뷰 없이 JSON API 컨트롤러 생성)
- [ ] 롤백 명령어 (`bun run igniter migrate:rollback`)
- [ ] 시드 명령어 (`bun run igniter db:seed`)
- [ ] 라우트별 미들웨어 실행 파이프라인 개선
- [ ] 유효성 검사 헬퍼
- [ ] 인증 (Auth) 라이브러리
- [ ] 로깅 시스템
- [ ] 테스트 프레임워크 통합
