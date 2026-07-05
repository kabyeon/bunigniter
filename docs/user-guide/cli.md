# ⌨️ CLI 명령어

```bash
bun run igniter <command> <name> [options]
```

## 스캐폴딩

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `make:scaffold` | Controller + Model + View + Migration 전체 생성 | `bun run igniter make:scaffold post --fields=title:string,content:text` |
| `make:scaffold --api` | API 모드 (뷰 없이 JSON 컨트롤러) | `bun run igniter make:scaffold post --api --fields=title:string` |
| `make:controller` | 컨트롤러 생성 | `bun run igniter make:controller users` |
| `make:controller --resource` | CRUD 컨트롤러 | `bun run igniter make:controller users --resource` |
| `make:model` | 모델 생성 | `bun run igniter make:model user --fields=name:string,email:string` |
| `make:view` | 뷰 템플릿 생성 | `bun run igniter make:view posts/create` |
| `make:view --resource` | CRUD 뷰 전체 생성 | `bun run igniter make:view posts --resource` |
| `make:migration` | 마이그레이션 생성 | `bun run igniter make:migration create_users_table` |
| `make:middleware` | 미들웨어 생성 | `bun run igniter make:middleware auth` |
| `make:helper` | 헬퍼 파일 생성 | `bun run igniter make:helper string` |
| `make:library` | 라이브러리 클래스 생성 | `bun run igniter make:library email` |
| `make:seed` | 시드 파일 생성 | `bun run igniter make:seed user_seeder` |

## 데이터베이스

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `migrate` | 마이그레이션 실행 | `bun run igniter migrate` |
| `migrate:rollback` | 최근 1개 롤백 | `bun run igniter migrate:rollback` |
| `migrate:rollback --steps=N` | N개 롤백 | `bun run igniter migrate:rollback --steps=3` |
| `migrate:rollback --all` | 전체 롤백 | `bun run igniter migrate:rollback --all` |
| `db:seed` | 전체 시드 실행 | `bun run igniter db:seed` |
| `db:seed --files=` | 특정 시드만 | `bun run igniter db:seed --files=user_seeder,post_seeder` |

## 기타

| 명령어 | 설명 |
|--------|------|
| `list:routes` | 라우트 목록 출력 |
| `serve` | 개발 서버 실행 |

## 파일명 규칙

모든 TypeScript 파일명은 **소문자 + snake_case**:

| 타입 | 파일명 규칙 | 예시 |
|------|------------|------|
| Controller | `{name}_controller.ts` | `post_controller.ts` |
| Model | `{name}_model.ts` | `post_model.ts` |
| Middleware | `{name}_middleware.ts` | `auth_middleware.ts` |
| Helper | `{name}_helper.ts` | `string_helper.ts` |
| Library | `{name}_library.ts` | `email_library.ts` |
| Migration | `{timestamp}_{name}.ts` | `1783262870269_create_posts_table.ts` |
| Seeder | `{name}.ts` | `user_seeder.ts` |

## make:scaffold 상세

**웹 스캐폴딩 (뷰 포함):**

```bash
bun run igniter make:scaffold post --fields=title:string,content:text
```

생성 파일: Model, Controller, Views (index/show/create/edit), Migration
→ `routes.ts`에 라우트 자동 등록

**API 스캐폴딩 (뷰 없음):**

```bash
bun run igniter make:scaffold product --api --fields=name:string,price:number
```

생성 파일: Model, Controller (JSON 응답), Migration
→ `routes.ts`에 `/api` 그룹으로 자동 등록
