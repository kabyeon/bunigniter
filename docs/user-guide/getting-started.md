# 🚀 빠른 시작

## 설치 방법

### 1. bunx create (권장)

```bash
bunx create-bunigniter@latest my-app
cd my-app
bun run dev
```

### 2. bun init + bunigniter 설치

```bash
mkdir my-app && cd my-app
bun init -y
bun add bunigniter
bun run bi init .
bun run dev
```

### 3. GitHub clone

```bash
git clone https://github.com/kabyeon/bunigniter.git my-app
cd my-app
bun install
bun run dev
```

## 서버 실행

```bash
# 개발 서버 (핫리로드)
bun run dev

# 프로덕션
bun run start
```

브라우저에서 `http://localhost:3000` 접속 → 🔥 환영 페이지

## 환경 변수

`.env` 파일에서 설정합니다:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `APP_NAME` | BunIgniter | 애플리케이션 이름 |
| `BASE_URL` | <http://localhost:3000> | 기본 URL |
| `NODE_ENV` | development | 환경 (development/production/testing) |
| `APP_DEBUG` | true | 디버그 모드 |
| `PORT` | 3000 | 서버 포트 |

## 기술 스택

| 구성요소 | 기술 | 버전 |
|---------|------|------|
| 런타임 | [Bun](https://bun.sh) | 최신 |
| HTTP 서버 | [Bun.serve](https://bun.sh/docs/runtime/http) | 내장 (SIMD 가속 라우팅) |
| 데이터베이스 | [Bun SQL](https://bun.sh/docs/runtime/sql) | 내장 (SQLite/PostgreSQL/MySQL) |
| 템플릿 엔진 | 자체 내장 | 외부 의존성 없음 |
| 린트/포맷 | [Biome](https://biomejs.dev/) | ^2.5.2 |
| 테스트 | [bun:test](https://bun.sh/docs/cli/test) | 내장 |

## 프로젝트 구조

### npm 패키지 모드 (bunx create / bun add bunigniter)

```
my-app/
├── app/
│   ├── config/           # 설정 파일
│   ├── controllers/      # 컨트롤러
│   ├── models/           # 모델
│   ├── views/            # 뷰 템플릿
│   ├── middleware/        # 미들웨어
│   ├── helpers/          # 커스텀 헬퍼
│   └── libraries/        # 커스텀 라이브러리
├── database/
│   ├── migrations/       # 마이그레이션
│   └── seeds/            # 시더
├── public/               # 정적 파일
├── storage/              # 런타임 저장소
├── node_modules/
│   └── bunigniter/       # 프레임워크 코어
│       ├── system/core/  # 시스템 코어
│       ├── system/helpers/ # 시스템 헬퍼
│       └── cli/          # CLI 도구
├── package.json
└── tsconfig.json
```

### Clone 모드 (git clone)

```
bunigniter/
├── system/core/          # 프레임워크 코어 (수정 금지)
│   ├── bootstrap.ts      # 서버 진입점
│   ├── router.ts         # 라우터
│   ├── controller.ts     # 기본 컨트롤러
│   ├── model.ts          # 기본 모델
│   ├── view.ts           # 뷰 렌더링
│   └── ...
├── system/helpers/       # 시스템 헬퍼
├── app/                  # 사용자 애플리케이션
│   ├── config/           # 설정
│   ├── controllers/      # 컨트롤러
│   ├── models/           # 모델
│   ├── views/            # 뷰
│   ├── middleware/       # 미들웨어
│   ├── helpers/          # 헬퍼
│   └── libraries/        # 라이브러리
├── cli/                  # CLI 스캐폴딩
├── database/             # 마이그레이션 & 시드
├── public/               # 정적 파일
├── storage/              # 런타임 저장소
└── tests/                # 테스트
```

## CLI 명령어

```bash
# 프로젝트 생성
bun run bi init my-app

# 스캐폴딩
bun run bi make:controller posts
bun run bi make:controller posts --resource
bun run bi make:model user
bun run bi make:view posts/index
bun run bi make:migration create_posts_table
bun run bi make:middleware auth
bun run bi make:scaffold post       # Controller + Model + View + Migration

# 데이터베이스
bun run bi migrate
bun run bi migrate:rollback
bun run bi migrate:status
bun run bi db:seed

# 개발 도구
bun run bi serve                    # 개발 서버
bun run bi list:routes              # 라우트 목록
bun run bi repl                     # 대화형 REPL
```

## 첫 컨트롤러 만들기

```bash
bun run bi make:controller hello
```

생성된 파일: `app/controllers/hello_controller.ts`

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";

export class HelloController extends Controller {
  async index(_ctx: Context) {
    return this.view("hello/index", { title: "Hello!" });
  }
}

export default new HelloController();
```

라우트 추가: `app/config/routes.ts`

```typescript
import helloController from "app/controllers/hello_controller.ts";

router.get("/hello", helloController, "index");
```

뷰 생성: `app/views/hello/index.html`

```html
<!-- layout:default -->

<!-- slot:title -->Hello<!-- endslot -->

<h1>{{ title }}</h1>
<p>BunIgniter에 오신 것을 환영합니다!</p>
```
