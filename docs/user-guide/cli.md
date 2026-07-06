# 🛠 CLI 명령어

BunIgniter는 AdonisJS Ace 스타일 CLI를 제공합니다.

## 사용법

```bash
bun run bi <command> [args] [options]
```

npm 패키지 모드에서는:

```bash
bun run node_modules/bunigniter/cli/index.ts <command> [args]
```

## 명령어 목록

### 프로젝트 초기화

| 명령어 | 설명 |
|--------|------|
| `init <name>` | 새 BunIgniter 프로젝트 생성 |

### 서버

| 명령어 | 설명 |
|--------|------|
| `serve` | 개발 서버 실행 (핫리로드, `--port`, `--host` 옵션) |
| `repl` | 인터랙티브 REPL 셸 |

### 스캐폴딩

| 명령어 | 설명 |
|--------|------|
| `make:controller <name>` | 컨트롤러 생성 (`--resource` CRUD 메서드) |
| `make:model <name>` | 모델 생성 (`--fields=name:type,...`) |
| `make:view <dir/action>` | 뷰 템플릿 생성 (`--resource` CRUD 뷰) |
| `make:migration <name>` | 마이그레이션 생성 (`--fields=name:type,...`) |
| `make:middleware <name>` | 미들웨어 생성 |
| `make:helper <name>` | 헬퍼 파일 생성 |
| `make:library <name>` | 라이브러리 클래스 생성 |
| `make:seed <name>` | 시더 파일 생성 |
| `make:scaffold <name>` | MVC 전체 생성 (`--api` JSON 모드, `--fields=name:type,...`) |

### 데이터베이스

| 명령어 | 설명 |
|--------|------|
| `migrate` | 마이그레이션 실행 (미실행 마이그레이션만) |
| `migrate:rollback` | 마이그레이션 롤백 (`--steps=N`, `--all`) |
| `migrate:status` | 마이그레이션 상태 확인 (적용/미적용 목록) |
| `db:seed` | 시더 실행 (`--files=name1,name2`) |

### 정보

| 명령어 | 설명 |
|--------|------|
| `list:routes` | 등록된 라우트 목록 출력 |

## serve 상세

```bash
bun run bi serve                # 기본 0.0.0.0:3000
bun run bi serve --port=8080    # 포트 변경
bun run bi serve --host=127.0.0.1  # 호스트 변경
```

`Bun.spawn`으로 `bun run --hot` 실행. 핫리로드 지원.

## migrate 상세

```bash
bun run bi migrate
```

- `migrations` 추적 테이블에서 이미 실행된 마이그레이션 확인
- 미실행 마이그레이션만 `up()` 실행
- 실행 완료 시 추적 테이블에 기록

## migrate:rollback 상세

```bash
bun run bi migrate:rollback           # 최근 1개 롤백
bun run bi migrate:rollback --steps=3  # 3개 롤백
bun run bi migrate:rollback --all      # 전체 롤백
```

## init 상세

```bash
bun run bi init my-app      # 새 프로젝트 디렉토리 생성
bun run bi init .            # 현재 디렉토리에 초기화
bun run bi init my-app --force  # 기존 파일 덮어쓰기
```

생성되는 파일:

- `package.json` — bunigniter 의존성 포함
- `tsconfig.json` — system/* 경로 매핑
- `.env` — 환경 변수
- `.gitignore`
- `app/config/` — app, database, routes, autoload 설정
- `app/controllers/welcome_controller.ts` — 기본 컨트롤러
- `app/views/` — layout, partials, welcome, errors 뷰
- `database/migrate.ts` — 마이그레이션 실행기
- `public/css/style.css` — 기본 스타일

## list:routes 상세

```bash
bun run bi list:routes
```

`app/config/routes.ts` 파일을 파싱하여 HTTP 메서드별 컬러 출력.
리소스 라우트는 7개 RESTful 라우트로 확장 표시.

## make:scaffold 상세

```bash
bun run bi make:scaffold post
bun run bi make:scaffold post --fields=title:string,content:text
bun run bi make:scaffold post --api --fields=title:string
```

- Model + Controller + Views + Migration 전체 생성
- `--api`: JSON API 컨트롤러 (뷰 없음)
- 라우트 자동 등록 (`app/config/routes.ts`)

## migrate:status 상세

```bash
bun run bi migrate:status
```

마이그레이션 파일 목록과 적용 상태를 표시합니다:

- ✅ 적용됨 — 배치 번호, 실행 시간 표시
- ⏳ 미적용 — 실행 대기

배치(batch) 단위로 관리되어 롤백 시 배치별로 처리됩니다.
