# 🚀 빠른 시작

## 설치

```bash
git clone <repo-url> bunigniter
cd bunigniter
bun install
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
| 템플릿 엔진 | [Rendu](https://github.com/h3js/rendu) | ^0.1.0 |
| 테스트 | [bun:test](https://bun.sh/docs/cli/test) | 내장 |

## 프로젝트 구조

```
bunigniter/
├── system/core/          # 프레임워크 코어 (수정 금지)
├── system/helpers/       # 전역 헬퍼 함수
├── app/config/           # 설정 (app.ts, database.ts, routes.ts)
├── app/controllers/      # 컨트롤러
├── app/models/           # 모델
├── app/views/            # Rendu 템플릿 (.html)
├── app/views/layout/     # 레이아웃 템플릿
├── app/middleware/        # 미들웨어
├── app/helpers/          # 커스텀 헬퍼
├── app/libraries/        # 커스텀 라이브러리
├── cli/commands/         # CLI 명령어
├── database/migrations/  # 마이그레이션
├── database/seeds/       # 시드
├── storage/logs/         # 로그 파일
├── storage/sessions/     # 파일 세션
├── storage/cache/        # 파일 캐시
├── public/               # 정적 파일 (css, js, uploads)
└── tests/                # 테스트 파일
```
