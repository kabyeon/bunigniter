# 🔥 BunIgniter

**CodeIgniter 3-Style Full Stack MVC Framework for Bun**

Bun + Elysia + Bun SQL + Rendu 기반의 풀스택 MVC 웹 프레임워크입니다.  
CodeIgniter 3의 친숙한 MVC 패턴과 AdonisJS Ace 스타일의 CLI 스캐폴딩을 결합했습니다.

---

## 📋 목차

- [기술 스택](#-기술-스택)
- [빠른 시작](#-빠른-시작)
- [프로젝트 구조](#-프로젝트-구조)
- [CLI 명령어](#-cli-명령어)
- [라우팅](#-라우팅)
- [컨트롤러](#-컨트롤러)
- [모델](#-모델)
- [뷰 (Rendu 템플릿)](#-뷰-rendu-템플릿)
- [레이아웃 시스템](#-레이아웃-시스템)
- [데이터베이스 설정](#-데이터베이스-설정)
- [마이그레이션](#-마이그레이션)
- [미들웨어](#-미들웨어)
- [세션](#-세션)
- [Input 헬퍼](#-input-헬퍼)
- [헬퍼 함수](#-헬퍼-함수)
- [정적 파일](#-정적-파일)
- [환경 변수](#-환경-변수)
- [CodeIgniter3 ↔ BunIgniter 비교](#-codeigniter3--bunigniter-비교)

---

## 🛠 기술 스택

| 구성요소 | 기술 | 버전 |
|---------|------|------|
| 런타임 | [Bun](https://bun.sh) | 최신 |
| HTTP 프레임워크 | [Elysia](https://elysiajs.com) | 2.0.0-exp.25 |
| 데이터베이스 | [Bun SQL](https://bun.sh/docs/runtime/sql) | 내장 (SQLite/PostgreSQL/MySQL) |
| 템플릿 엔진 | [Rendu](https://github.com/h3js/rendu) | ^0.1.0 |
| 언어 | TypeScript | - |

---

## 🚀 빠른 시작

```bash
# 저장소 클론
git clone <repo-url> bunigniter
cd bunigniter

# 의존성 설치
bun install

# 개발 서버 실행 (핫리로드)
bun run dev

# 프로덕션 실행
bun run start
```

브라우저에서 `http://localhost:3000` 접속 → 🔥 환영 페이지 확인

---

## 📁 프로젝트 구조

```
bunigniter/
├── system/                          # 프레임워크 코어 (수정 금지)
│   ├── core/
│   │   ├── bootstrap.ts             # 진입점 (CI3 index.php 역할)
│   │   ├── config.ts                # 설정 로더 ($this->config->load())
│   │   ├── controller.ts            # 기본 컨트롤러 (CI_Controller)
│   │   ├── database.ts              # DB 매니저 (Bun SQL 연결 관리)
│   │   ├── index.ts                 # 시스템 통합 내보내기
│   │   ├── input.ts                 # 입력 헬퍼 ($this->input)
│   │   ├── middleware.ts            # 미들웨어 파이프라인
│   │   ├── model.ts                 # 기본 모델 (CI_Model)
│   │   ├── router.ts                # 라우터 (Elysia 래핑)
│   │   ├── session.ts               # 세션 관리 ($this->session)
│   │   └── view.ts                  # 뷰 렌더러 (Rendu + 레이아웃)
│   └── helpers/
│       └── index.ts                 # 전역 헬퍼 함수
│
├── app/                             # 애플리케이션 코드 (사용자 영역)
│   ├── config/
│   │   ├── app.ts                   # 앱 설정 (config.php)
│   │   ├── database.ts              # DB 설정 (database.php)
│   │   └── routes.ts                # 라우트 정의 (routes.php)
│   ├── controllers/                 # 컨트롤러
│   ├── models/                      # 모델
│   ├── views/                       # Rendu 템플릿 (.html)
│   │   ├── layout/                  # 레이아웃 템플릿
│   │   │   └── default.html         # 기본 레이아웃
│   │   ├── errors/                  # 에러 페이지
│   │   └── {resource}/             # 리소스별 뷰 디렉토리
│   ├── middleware/                  # 미들웨어
│   ├── helpers/                     # 커스텀 헬퍼
│   └── libraries/                   # 커스텀 라이브러리
│
├── cli/                             # CLI 스캐폴딩 시스템
│   ├── index.ts                     # CLI 진입점
│   ├── registry.ts                  # 명령어 레지스트리
│   ├── utils.ts                     # 유틸리티 (이름 변환, 파일 생성)
│   └── commands/                    # CLI 명령어 구현
│       ├── makecontroller.ts
│       ├── makemodel.ts
│       ├── makeview.ts
│       ├── makemigration.ts
│       ├── makemiddleware.ts
│       ├── makescaffold.ts
│       ├── makehelper.ts
│       ├── makelibrary.ts
│       ├── listroutes.ts
│       ├── serve.ts
│       └── migrate.ts
│
├── database/
│   ├── migrate.ts                   # 마이그레이션 실행기
│   └── migrations/                  # 마이그레이션 파일 (타임스탬프 정렬)
│
├── public/                          # 정적 파일 (CSS, JS, 이미지)
│   ├── css/style.css
│   └── js/app.js
│
├── .env                             # 환경 변수
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## ⌨️ CLI 명령어

AdonisJS Ace 스타일의 스캐폴딩 CLI를 제공합니다.

```bash
bun run igniter <command> <name> [options]
```

### 명령어 목록

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `make:scaffold` | **Controller + Model + View + Migration 전체 생성** | `bun run igniter make:scaffold post --fields=title:string,content:text` |
| `make:controller` | 컨트롤러 생성 | `bun run igniter make:controller users` |
| `make:controller` | CRUD 컨트롤러 생성 | `bun run igniter make:controller users --resource` |
| `make:model` | 모델 생성 | `bun run igniter make:model user --fields=name:string,email:string` |
| `make:view` | 뷰 템플릿 생성 | `bun run igniter make:view posts/create` |
| `make:view` | CRUD 뷰 전체 생성 | `bun run igniter make:view posts --resource` |
| `make:migration` | 마이그레이션 생성 | `bun run igniter make:migration create_users_table` |
| `make:migration` | 컬럼 추가 마이그레이션 | `bun run igniter make:migration add_email_to_users --fields=email:string` |
| `make:middleware` | 미들웨어 생성 | `bun run igniter make:middleware auth` |
| `make:helper` | 헬퍼 파일 생성 | `bun run igniter make:helper string` |
| `make:library` | 라이브러리 클래스 생성 | `bun run igniter make:library email` |
| `migrate` | 마이그레이션 실행 | `bun run igniter migrate` |
| `list:routes` | 라우트 목록 출력 | `bun run igniter list:routes` |

### 스캐폴딩 예시

`make:scaffold` 하나의 명령으로 MVC 전체가 자동 생성됩니다:

```bash
bun run igniter make:scaffold post --fields=title:string,content:text,author:string
```

**생성 결과:**

| 파일 | 경로 |
|------|------|
| Model | `app/models/post_model.ts` |
| Controller | `app/controllers/post_controller.ts` |
| Views | `app/views/posts/index.html`, `show.html`, `create.html`, `edit.html` |
| Migration | `database/migrations/<timestamp>_create_posts_table.ts` |

**라우트 등록** (`app/config/routes.ts`):

```typescript
import post_controller from "app/controllers/post_controller.ts";
router.resource("posts", post_controller);
```

**마이그레이션 실행:**

```bash
bun run migrate
```

### 파일명 규칙

모든 TypeScript 파일명은 **소문자 + snake_case** 를 사용합니다:

| 타입 | 파일명 규칙 | 예시 |
|------|------------|------|
| Controller | `{name}_controller.ts` | `post_controller.ts` |
| Model | `{name}_model.ts` | `post_model.ts` |
| Middleware | `{name}_middleware.ts` | `auth_middleware.ts` |
| Helper | `{name}_helper.ts` | `string_helper.ts` |
| Library | `{name}_library.ts` | `email_library.ts` |
| Migration | `{timestamp}_{name}.ts` | `1783262870269_create_posts_table.ts` |

---

## 🛤 라우팅

`app/config/routes.ts` 에서 라우트를 정의합니다.

```typescript
import { Router } from "system/core/router.ts";
import welcomeController from "app/controllers/welcome_controller.ts";
import userController from "app/controllers/user_controller.ts";

const router = new Router();

// 기본 라우트
router.get("/", welcomeController, "index");

// 개별 라우트
router.get("/users", userController, "index");
router.get("/users/:id", userController, "show");
router.post("/users", userController, "store");
router.put("/users/:id", userController, "update");
router.delete("/users/:id", userController, "delete");

// RESTful 리소스 라우트 (위 7개 라우트를 한 번에 생성)
router.resource("users", userController);

export default router;
```

### `router.resource()` 가 생성하는 라우트

| HTTP Method | Path | Controller Method | 설명 |
|-------------|------|-------------------|------|
| GET | `/users` | `index` | 목록 |
| GET | `/users/create` | `create` | 생성 폼 |
| POST | `/users` | `store` | 저장 |
| GET | `/users/:id` | `show` | 상세 |
| GET | `/users/:id/edit` | `edit` | 수정 폼 |
| PUT | `/users/:id` | `update` | 수정 |
| DELETE | `/users/:id` | `delete` | 삭제 |

---

## 🎮 컨트롤러

`Controller` 클래스를 상속받아 작성합니다.

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import userModel from "app/models/user_model.ts";

export class UserController extends Controller {
  // GET /users
  async index({ request, response }: Context) {
    const users = await userModel.findAll();
    return this.view("users/index", { users });
  }

  // GET /users/:id
  async show({ request, params, response }: Context) {
    const user = await userModel.findById(Number(params.id));
    if (!user) return response.status(404).send("Not Found");
    return this.view("users/show", { user });
  }

  // POST /users
  async store({ request, response }: Context) {
    const data = request.body();
    await userModel.create(data);
    return response.redirect("/users");
  }

  // JSON API 응답
  async apiList({ request, response }: Context) {
    const users = await userModel.findAll();
    return this.json(users);
  }

  // 리다이렉트
  async logout({ request, response }: Context) {
    return this.redirect("/login");
  }
}

export default new UserController();
```

### Context 인터페이스

컨트롤러 메서드의 첫 번째 인자로 전달되는 컨텍스트 객체:

```typescript
interface Context {
  request: Request;            // 웹 표준 Request 객체
  response: {
    status: (code: number) => any;
    redirect: (url: string) => Response;
    json: (data: any) => Response;
    send: (body: string | Response) => Response;
    headers: (headers: Record<string, string>) => any;
    cookie: (name: string, value: string, options?: any) => void;
  };
  params: Record<string, string>;  // URL 파라미터 (:id 등)
  query: Record<string, string>;   // 쿼리 파라미터
  body: () => any;                 // 요청 본문
}
```

### Controller 메서드

| 메서드 | 설명 | 반환 |
|--------|------|------|
| `this.view(path, data)` | 뷰 렌더링 | `Promise<Response>` |
| `this.json(data, status?)` | JSON 응답 | `Response` |
| `this.redirect(url)` | 리다이렉트 (302) | `Response` |

---

## 🗄 모델

`Model<T>` 제네릭 클래스를 상속받아 작성합니다.

```typescript
import { Model } from "system/core/model.ts";

export interface UserInterface {
  id?: number;
  name?: string;
  email?: string;
  age?: number;
  created_at?: string;
  updated_at?: string;
}

export class UserModel extends Model<UserInterface> {
  override tableName = "users";
}

export default new UserModel();
```

### Model 메서드

| 메서드 | 설명 | CI3 대응 |
|--------|------|----------|
| `findAll()` | 전체 조회 | `$this->db->get()->result()` |
| `findById(id)` | ID로 조회 | `$this->db->where('id', $id)->get()->row()` |
| `findWhere(conditions)` | 조건 조회 | `$this->db->where($conditions)->get()->result()` |
| `create(data)` | 레코드 생성 | `$this->db->insert($data)` |
| `update(id, data)` | 레코드 수정 | `$this->db->where('id', $id)->update($data)` |
| `delete(id)` | 레코드 삭제 | `$this->db->where('id', $id)->delete()` |
| `count(conditions?)` | 개수 조회 | `$this->db->count_all_results()` |
| `limit(limit, offset)` | LIMIT 조회 | `$this->db->limit($limit, $offset)->get()->result()` |
| `paginate(page, perPage)` | 페이지네이션 | - |
| `transaction(callback)` | 트랜잭션 | `$this->db->trans_start() ... trans_complete()` |

### 사용 예시

```typescript
import userModel from "app/models/user_model.ts";

// 전체 조회
const users = await userModel.findAll();

// 조건 조회
const activeUsers = await userModel.findWhere({ email: "test@example.com" });

// 생성
const newUser = await userModel.create({ name: "Alice", email: "alice@test.com" });

// 수정
await userModel.update(1, { name: "Alice Updated" });

// 삭제
await userModel.delete(1);

// 페이지네이션
const result = await userModel.paginate(2, 15);
// result = { data: [...], total: 100, page: 2, perPage: 15, totalPages: 7 }

// 트랜잭션
await userModel.transaction(async (tx) => {
  await tx`INSERT INTO users (name) VALUES (${"Alice"})`;
  await tx`UPDATE accounts SET balance = balance - 100 WHERE user_id = 1`;
});
```

### 직접 SQL 실행

Bun SQL의 tagged template literal을 직접 사용할 수도 있습니다:

```typescript
import { getDB } from "system/core/database.ts";

const sql = await getDB();

// 안전한 파라미터 바인딩 (SQL Injection 방지)
const users = await sql`SELECT * FROM users WHERE age > ${20}`;

// 테이블명 동적 참조
await sql`SELECT * FROM ${sql("users")}`;

// 객체 삽입
await sql`INSERT INTO users ${sql({ name: "Alice", email: "alice@test.com" })}`;

// Bulk Insert
await sql`INSERT INTO users ${sql([
  { name: "Alice", email: "alice@test.com" },
  { name: "Bob", email: "bob@test.com" },
])}`;
```

---

## 🎨 뷰 (Rendu 템플릿)

[Rendu](https://github.com/h3js/rendu) 템플릿 엔진을 사용합니다. PHP 스타일 문법으로 서버 사이드 렌더링을 제공합니다.

### 문법

```html
<!-- 변수 출력 (HTML 이스케이프) -->
<h1>{{ title }}</h1>

<!-- 변수 출력 (이스케이프 없음 - HTML 그대로) -->
<div>{{{ rawHtml }}}</div>

<!-- 짧은 출력 (이스케이프 없음) -->
<p><?= name ?></p>

<!-- 조건문 -->
<? if (items.length > 0) { ?>
  <p>항목이 있습니다.</p>
<? } else { ?>
  <p>항목이 없습니다.</p>
<? } ?>

<!-- 반복문 -->
<? for (const item of items) { ?>
  <li>{{ item.name }}</li>
<? } ?>

<!-- 서버 사이드 스크립트 -->
<script server>
  const currentTime = new Date().toISOString();
</script>
```

### 뷰 호출

컨트롤러에서 `this.view()` 로 렌더링:

```typescript
// app/views/posts/index.html 렌더링
return this.view("posts/index", { posts, title: "게시글 목록" });

// app/views/users/show.html 렌더링
return this.view("users/show", { user });
```

---

## 📐 레이아웃 시스템

뷰 템플릿 상단에 `<!-- layout:name -->` 주석을 추가하면 자동으로 레이아웃이 적용됩니다.

### 레이아웃 정의 (`app/views/layout/default.html`)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>{{ title ?? "BunIgniter" }}</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <nav class="navbar">
    <div class="container">
      <a href="/" class="navbar-brand">🔥 {{ appName ?? "BunIgniter" }}</a>
    </div>
  </nav>

  <main class="container">
    {{{ content }}}     <!-- ← 뷰 내용이 여기에 삽입됨 -->
  </main>

  <footer class="footer">
    <div class="container">
      <p>&copy; 2025 BunIgniter</p>
    </div>
  </footer>
</body>
</html>
```

### 뷰에서 레이아웃 사용

뷰 파일 상단에 주석만 추가하면 됩니다:

```html
<!-- layout:default -->

<h1>게시글 목록</h1>
<table class="table">
  <!-- 내용 -->
</table>
```

### 레이아웃 없이 독립 뷰

주석이 없으면 레이아웃 없이 독립적으로 렌더링됩니다:

```html
<h1>독립 페이지</h1>
<p>레이아웃 없이 렌더링됩니다.</p>
```

### 여러 레이아웃

`app/views/layout/` 에 새 레이아웃을 추가하고 주석으로 지정:

```html
<!-- layout:admin -->
<h1>관리자 대시보드</h1>
```

---

## 🗃 데이터베이스 설정

`app/config/database.ts` 에서 설정합니다.

### SQLite (기본)

```typescript
const config: DatabaseConfig = {
  defaultGroup: "default",
  groups: {
    default: {
      adapter: "sqlite",
      filename: "./database/bunigniter.db",
      create: true,
    },
  },
};
```

### PostgreSQL

```typescript
const config: DatabaseConfig = {
  defaultGroup: "default",
  groups: {
    default: {
      adapter: "postgres",
      url: "postgres://user:pass@localhost:5432/mydb",
      max: 20,
      idleTimeout: 30,
    },
  },
};
```

### MySQL

```typescript
const config: DatabaseConfig = {
  defaultGroup: "default",
  groups: {
    default: {
      adapter: "mysql",
      url: "mysql://user:pass@localhost:3306/mydb",
      max: 10,
    },
  },
};
```

### 다중 연결 그룹

```typescript
const config: DatabaseConfig = {
  defaultGroup: "default",
  groups: {
    default: {
      adapter: "sqlite",
      filename: "./database/app.db",
      create: true,
    },
    analytics: {
      adapter: "postgres",
      url: "postgres://user:pass@analytics-db:5432/analytics",
    },
  },
};
```

```typescript
// 기본 연결 사용
const sql = await getDB();

// 특정 그룹 연결 사용
const analyticsDB = await getDB("analytics");
```

---

## 📄 마이그레이션

### 마이그레이션 파일 생성

```bash
# 테이블 생성
bun run igniter make:migration create_users_table --fields=name:string,email:string,age:number

# 컬럼 추가
bun run igniter make:migration add_email_to_users --fields=email:string
```

### 마이그레이션 파일 구조

```typescript
// database/migrations/<timestamp>_create_users_table.ts
import { SQL } from "bun";

export async function up(sql: SQL): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      age INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

export async function down(sql: SQL): Promise<void> {
  await sql`
    DROP TABLE IF EXISTS users
  `;
}
```

### 마이그레이션 실행

```bash
bun run migrate
```

실행기는 `database/migrations/` 폴더의 파일을 타임스탬프 순으로 실행하며,  
`migrations` 추적 테이블로 이미 실행된 마이그레이션은 건너뜁니다.

---

## 🛡 미들웨어

### 미들웨어 생성

```bash
bun run igniter make:middleware auth
```

### 미들웨어 작성

```typescript
// app/middleware/auth_middleware.ts
import type { MiddlewareContext } from "system/core/middleware.ts";

export async function authMiddleware({ request, response, next }: MiddlewareContext): Promise<Response | void> {
  // 인증 로직
  const token = request.headers.get("authorization");
  if (!token) {
    return response.redirect("/login");
  }

  // 다음 핸들러로 진행
  return next();
}

export default authMiddleware;
```

### 라우트에 미들웨어 적용

```typescript
// app/config/routes.ts
import { Router } from "system/core/router.ts";
import authMiddleware from "app/middleware/auth_middleware.ts";

const router = new Router();

// 글로벌 미들웨어
router.use(authMiddleware);

// 리소스 라우트에 미들웨어 적용
router.resource("admin", adminController, [authMiddleware]);
```

---

## 🔐 세션

```typescript
import { Session } from "system/core/session.ts";

// 세션 생성 (요청에서)
const session = new Session(request);

// 데이터 설정
session.set("userId", 42);
session.set("username", "alice");

// 데이터 조회
const userId = session.get("userId"); // 42

// 데이터 존재 확인
session.has("userId"); // true

// 데이터 삭제
session.remove("userId");

// Flash 데이터 (1회성)
session.flash("message", "저장되었습니다!");
const msg = session.getFlash("message"); // "저장되었습니다!" (조회 후 자동 삭제)

// 세션 파기
session.destroy();

// 응답에 세션 쿠키 설정
const cookieHeader = session.getCookieHeader();
```

---

## 📥 Input 헬퍼

```typescript
import { Input } from "system/core/input.ts";

// POST 데이터
const name = await Input.post(request, "name");

// GET 파라미터
const page = Input.get(request, "page");

// 전체 GET 파라미터
const allParams = Input.get(request);

// 요청 헤더
const auth = Input.header(request, "authorization");

// 요청 메서드
Input.method(request); // "GET", "POST" 등

// 클라이언트 IP
Input.ip(request);

// User Agent
Input.userAgent(request);

// AJAX 요청 확인
Input.isAjax(request);

// JSON 요청 확인
Input.isJson(request);
```

---

## 🧰 헬퍼 함수

`system/helpers/index.ts` 에서 제공합니다.

```typescript
import {
  siteUrl, baseUrl, currentUrl, redirect,
  slug, truncate, escapeHtml,
  plural, formatNumber, formatCurrency,
  formatDate, timeAgo,
} from "system/helpers/index.ts";

// URL
siteUrl("posts/1");         // "http://localhost:3000/posts/1"
baseUrl();                  // "http://localhost:3000"

// 문자열
slug("Hello World");        // "hello-world"
truncate("Long text...", 10); // "Long text..."

// 날짜
formatDate(new Date(), "Y-m-d H:i:s"); // "2025-07-05 23:30:00"
timeAgo(new Date());        // "방금 전", "5분 전", "2시간 전", "3일 전"

// 숫자/통화
formatNumber(1234567);      // "1,234,567"
formatCurrency(50000);      // "50,000원"
```

---

## 📦 정적 파일

`public/` 디렉토리의 파일은 자동으로 서비스됩니다:

- `/css/*` → `public/css/*`
- `/js/*` → `public/js/*`
- `/images/*` → `public/images/*`

---

## ⚙ 환경 변수

`.env` 파일에서 설정합니다:

```env
APP_NAME=BunIgniter
BASE_URL=http://localhost:3000
NODE_ENV=development
APP_DEBUG=true
PORT=3000
```

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `APP_NAME` | BunIgniter | 애플리케이션 이름 |
| `BASE_URL` | <http://localhost:3000> | 기본 URL |
| `NODE_ENV` | development | 환경 (development/production/testing) |
| `APP_DEBUG` | true | 디버그 모드 (에러 메시지 표시) |
| `PORT` | 3000 | 서버 포트 |

---

## 🔄 CodeIgniter3 ↔ BunIgniter 비교

| CodeIgniter 3 | BunIgniter | 비고 |
|---------------|------------|------|
| `application/` | `app/` | 애플리케이션 디렉토리 |
| `system/` | `system/` | 프레임워크 코어 |
| `CI_Controller` | `Controller` | 기본 컨트롤러 |
| `CI_Model` | `Model<T>` | 기본 모델 (제네릭) |
| `$this->load->view()` | `this.view()` | 뷰 렌더링 |
| `$this->db->get()` | `model.findAll()` | 전체 조회 |
| `$this->db->insert()` | `model.create()` | 레코드 생성 |
| `$this->db->where()->update()` | `model.update()` | 레코드 수정 |
| `$this->db->where()->delete()` | `model.delete()` | 레코드 삭제 |
| `$this->input->post()` | `Input.post()` | POST 데이터 |
| `$this->input->get()` | `Input.get()` | GET 파라미터 |
| `$this->session->set_userdata()` | `session.set()` | 세션 설정 |
| `$this->session->userdata()` | `session.get()` | 세션 조회 |
| `$this->config->load()` | `loadConfig()` | 설정 로드 |
| `redirect()` | `this.redirect()` | 리다이렉트 |
| `$route['default_controller']` | `router.get("/", ...)` | 기본 라우트 |
| PHP | TypeScript | 언어 |
| MySQL | SQLite/PostgreSQL/MySQL | 데이터베이스 |
| `.php` 뷰 | `.html` (Rendu) | 템플릿 |
| 수동 생성 | CLI 스캐폴딩 | 코드 생성 |

---

## 📜 라이선스

MIT
