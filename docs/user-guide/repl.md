# 🖥 REPL

AdonisJS Ace REPL 스타일 인터랙티브 셸. 프레임워크 컨텍스트가 주입된 대화형 환경.

## 시작

```bash
bun run igniter repl
```

## 기본 명령어

| 명령어 | 설명 |
|--------|------|
| `.ls` | 컨텍스트 프로퍼티/메서드 목록 |
| `.models` | 사용 가능한 모델 목록 |
| `.routes` | 등록된 라우트 목록 |
| `.config` | 애플리케이션 설정 표시 |
| `.load <path>` | 모듈 로드 |
| `.help` | 도움말 |
| `.exit` | REPL 종료 |

## 프레임워크 컨텍스트

REPL 시작 시 다음 모듈이 자동 주입됩니다:

- `Controller`, `Model`, `Router`
- `Validator`, `validate`
- `Auth`, `Cache`, `Queue`, `Scheduler`
- `Email`, `Logger`, `Upload`
- `AuditLog`, `DistributedLock`
- `Archive`, `Shell`
- `getCookie`, `setCookie`, `paginationHtml`
- `config` - 애플리케이션 설정
- `env` - 환경변수
- `app` - 런타임 정보 (name, version, pid)
- `db` - 데이터베이스 연결 함수

## 사용 예시

```bash
bun run igniter repl

> Validator.validate({ email: "bad" }, { email: "required|email" })
{ success: false, errors: [...] }

> Crypto.hash("hello world")
"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"

> .models
  post_model

> .load ./app/models/post_model
Loaded: post_model

> .config
{ name: "BunIgniter", ... }
```

## 커스텀 메서드

REPL 내에서 사용 가능한 전역 메서드:

- `clear <name>` - 컨텍스트 프로퍼티 제거
- `p <function>` - 콜백 함수를 Promise로 변환
