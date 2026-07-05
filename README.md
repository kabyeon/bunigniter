# 🔥 BunIgniter

**CodeIgniter 3-Style Full Stack MVC Framework for Bun**

Bun + Elysia + Bun SQL + Rendu 기반의 풀스택 MVC 웹 프레임워크입니다。
CodeIgniter 3의 친숙한 MVC 패턴과 AdonisJS Ace 스타일의 CLI 스캐폴딩을 결합했습니다.

---

## 🛠 기술 스택

| 구성요소 | 기술 | 버전 |
|---------|------|------|
| 런타임 | [Bun](https://bun.sh) | 최신 |
| HTTP 프레임워크 | [Elysia](https://elysiajs.com) | 2.0.0-exp.25 |
| 데이터베이스 | [Bun SQL](https://bun.sh/docs/runtime/sql) | 내장 (SQLite/PostgreSQL/MySQL) |
| 템플릿 엔진 | [Rendu](https://github.com/h3js/rendu) | ^0.1.0 |
| 테스트 | [bun:test](https://bun.sh/docs/cli/test) | 내장 |

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| MVC 아키텍처 | Controller / Model / View 분리 |
| CLI 스캐폴딩 | `make:scaffold` 로 CRUD 전체 자동 생성 |
| 세션 드라이버 | Memory / File / Redis 교체 가능 (`SessionDriver` 인터페이스) |
| CSRF 보호 | Double Submit Cookie (JS-readable) |
| 인증 | bcrypt 기반 Auth + `authGuard` / `guestGuard` |
| 유효성 검사 | 20+ 규칙, CI3 스타일 파이프 문법 |
| 파일 업로드 | MIME/확장자/크기 검증, UUID/해시 네이밍 |
| 이메일 | SMTP / sendmail / log 드라이버 + 템플릿 렌더링 |
| 캐시 | Memory / File / Redis 드라이버, `remember()` 콜백 |
| WebSocket | Pub/Sub 채널, Elysia WS 통합 |
| CORS 미들웨어 | 오리진/메서드/헤더 커스터마이징 |
| Rate Limiting | 슬라이딩 윈도우, IP 기반, `X-RateLimit-*` 헤더 |
| 라우트 모델 바인딩 | 파라미터 자동 DB 조회 + 404 |
| OpenAPI / Swagger | Router → OpenAPI 3.0 스펙 자동 생성 |
| 페이지네이션 | HTML 네비게이션 / API 메타데이터 |
| 로깅 | 파일+콘솔, 레벨 필터링, 로그 회전 |
| 통합 테스트 | `IntegrationTestClient` (HTTP 요청 자동화) |
| 큐/잡 시스템 | Memory / Redis 드라이버, 지연 실행, 재시도, 실패 처리 |
| 스케줄드 잡 | Bun.cron() 인프로세스 + OS-레벨 크론 |
| 큐 대시보드 | HTML 모니터링 + JSON API |
| Redis Pub/Sub | BroadcastQueue, 다중 서버 잡 분산 |
| 쿠키 | Bun.Cookie / CookieMap 내장 |
| 아카이브 | Bun.Archive 내장 (tar/gzip) |
| 셸 | Bun.spawn / Bun.$ 내장 |
| 감사 로그 | 모델 이벤트 추적 + 로깅 통합 |

## 🚀 빠른 시작

```bash
git clone <repo-url> bunigniter && cd bunigniter
bun install
bun run dev        # http://localhost:3000
```

## 📁 프로젝트 구조

```
bunigniter/
├── system/core/          # 프레임워크 코어 (수정 금지)
├── system/helpers/       # 전역 헬퍼 함수
├── app/config/           # 설정 (app, database, routes, email, cache, queue, scheduler)
├── app/controllers/      # 컨트롤러
├── app/models/           # 모델
├── app/views/            # Rendu 템플릿 (.html)
├── app/views/layout/     # 레이아웃
├── app/middleware/        # 미들웨어
├── app/helpers/          # 커스텀 헬퍼
├── app/libraries/        # 커스텀 라이브러리
├── cli/commands/         # CLI 명령어
├── database/migrations/  # 마이그레이션
├── database/seeds/       # 시드
├── storage/              # logs, sessions, cache
├── public/               # 정적 파일 (css, js, uploads)
├── tests/                # 테스트 파일
└── docs/user-guide/      # 기능별 상세 가이드
```

## ⌨️ CLI 요약

```bash
bun run igniter make:scaffold post --fields=title:string,content:text  # 전체 생성
bun run igniter make:scaffold post --api --fields=title:string         # API 전용
bun run igniter migrate                                               # 마이그레이션
bun run igniter migrate:rollback --steps=3                            # 롤백
bun run igniter db:seed                                               # 시드 실행
bun run igniter list:routes                                           # 라우트 목록
```

## 🧪 테스트

```bash
bun test   # 159 pass, 0 fail
```

## 🔄 CI3 ↔ BunIgniter

| CI3 | BunIgniter |
|-----|-----------|
| `CI_Controller` | `Controller` |
| `CI_Model` | `Model<T>` |
| `$this->load->view()` | `this.view()` |
| `$this->db->insert()` | `model.create()` |
| `$this->form_validation` | `validate()` |
| `$this->ion_auth->login()` | `Auth.attempt()` |
| `$this->upload->do_upload()` | `Upload.save()` |
| `$this->input->cookie()` | `getCookie()` |
| `$this->input->set_cookie()` | `setCookie()` |
| CI Zip | `Archive` (Bun.Archive) |
| PHP exec() | `Shell` (Bun.spawn) |

## 📖 상세 가이드

| 가이드 | 설명 |
|--------|------|
| [빠른 시작](docs/user-guide/getting-started.md) | 설치, 환경변수, 프로젝트 구조 |
| [CLI 명령어](docs/user-guide/cli.md) | 스캐폴딩, 마이그레이션, 시드 |
| [라우팅](docs/user-guide/routing.md) | 라우트 정의, 리소스, 그룹, 모델 바인딩 |
| [컨트롤러](docs/user-guide/controllers.md) | Controller 클래스, Context, 응답 |
| [모델](docs/user-guide/models.md) | CRUD, 페이지네이션, 트랜잭션 |
| [뷰 & 레이아웃](docs/user-guide/views.md) | Rendu 문법, 레이아웃 시스템 |
| [데이터베이스](docs/user-guide/database.md) | 설정, 마이그레이션, 시드 |
| [미들웨어](docs/user-guide/middleware.md) | 파이프라인, 내장 미들웨어 |
| [인증](docs/user-guide/auth.md) | Auth, authGuard, 비밀번호 해싱 |
| [유효성 검사](docs/user-guide/validation.md) | 20+ 규칙, 커스텀 메시지 |
| [CSRF 보호](docs/user-guide/csrf.md) | Double Submit Cookie |
| [세션](docs/user-guide/session.md) | Memory / File / Redis 드라이버 |
| [파일 업로드](docs/user-guide/upload.md) | 단일/다중 업로드, 검증 |
| [페이지네이션](docs/user-guide/pagination.md) | HTML / API |
| [이메일](docs/user-guide/email.md) | SMTP / sendmail / log |
| [캐시](docs/user-guide/cache.md) | Memory / File / Redis, remember() |
| [큐/잡 시스템](docs/user-guide/queue.md) | 백그라운드 작업, 지연 실행, 재시도 |
| [스케줄드 잡](docs/user-guide/scheduler.md) | Bun.cron(), 인프로세스 + OS-레벨 |
| [큐 대시보드](docs/user-guide/dashboard.md) | HTML 모니터링 + JSON API |
| [Redis Pub/Sub](docs/user-guide/broadcast-queue.md) | 다중 서버 잡 분산 |
| [쿠키](docs/user-guide/cookies.md) | Bun.Cookie / CookieMap |
| [아카이브](docs/user-guide/archive.md) | Bun.Archive (tar/gzip) |
| [셸](docs/user-guide/shell.md) | Bun.spawn / Bun.$ |
| [감사 로그](docs/user-guide/audit-log.md) | 모델 이벤트 추적 |
| [WebSocket](docs/user-guide/websocket.md) | Pub/Sub, Elysia 통합 |
| [CORS](docs/user-guide/cors.md) | 오리진, 프리플라이트 |
| [Rate Limiting](docs/user-guide/rate-limit.md) | 슬라이딩 윈도우, IP 기반 |
| [라우트 모델 바인딩](docs/user-guide/route-model-binding.md) | 자동 DB 조회 |
| [OpenAPI / Swagger](docs/user-guide/openapi.md) | 스펙 자동 생성, Swagger UI |
| [로깅](docs/user-guide/logging.md) | 파일+콘솔, 회전 |
| [테스트](docs/user-guide/testing.md) | 단위/통합 테스트 |
| [헬퍼 함수](docs/user-guide/helpers.md) | URL, 문자열, 날짜, 통화 |

## 📜 라이선스

MIT
