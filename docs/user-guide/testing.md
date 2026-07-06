# 🧪 테스트

Bun 내장 테스트 러너(`bun:test`)를 사용합니다.

## 실행

```bash
bun test              # 전체
bun test --watch      # 워치
bun test tests/validator_test.ts  # 특정 파일
```

## 단위 테스트 작성

```typescript
import { describe, test, expect } from "bun:test";
import { validate } from "../system/core/validator.ts";

describe("유효성 검사", () => {
  test("이메일 검증", () => {
    const { valid } = validate({ email: "bad" }, { email: "required|email" });
    expect(valid).toBe(false);
  });
});
```

## 테스트 헬퍼

```typescript
import { createTestDB, testRequest, parseJsonResponse } from "../system/core/test_helper.ts";

// 인메모리 DB
const db = await createTestDB();
await db`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`;
const result = await db`SELECT * FROM users`;
await db.close();
```

## E2E 테스트 (서버 미실행)

Router를 직접 호출하여 HTTP 요청→응답을 테스트합니다:

```typescript
import { httpTest } from "../system/core/e2e_test.ts";
import { Router } from "../system/core/router.ts";

const router = new Router();
router.get("/users", userController, "index");
router.post("/users", userController, "store");

const test = httpTest(router);

// GET 요청
const res = await test.get("/users");
test.assertStatus(res, 200);

// POST 요청
const res2 = await test.post("/users", { name: "Test" });
test.assertJson(res2, { success: true });

// 리다이렉트 검증
test.assertRedirect(await test.get("/old-path"), "/new-path");

// 본문 포함 검증
test.assertBodyContains(await test.get("/users"), "Test");
```

### httpTest 메서드

| 메서드 | 설명 |
|--------|------|
| `get(path, headers?)` | GET 요청 |
| `post(path, body?, headers?)` | POST 요청 |
| `put(path, body?, headers?)` | PUT 요청 |
| `patch(path, body?, headers?)` | PATCH 요청 |
| `delete(path, headers?)` | DELETE 요청 |
| `assertStatus(res, code)` | 상태 코드 검증 |
| `assertJson(res, expected)` | JSON 응답 검증 |
| `assertRedirect(res, location?)` | 리다이렉트 검증 |
| `assertBodyContains(res, text)` | 본문 포함 검증 |

## 통합 테스트 (실서버)

```typescript
import { createIntegrationTestClient } from "../system/core/integration_test.ts";

const { client, close } = await createIntegrationTestClient(3999);

// HTTP 요청
const res = await client.get("/users");
const json = await res.json();

// 폼 전송
await client.postForm("/login", { email: "test@test.com", password: "1234" });

// 상태 코드 확인
await client.assertStatus("/users", 200);

close(); // 반드시 종료
```

## IntegrationTestClient 메서드

| 메서드 | 설명 |
|--------|------|
| `get(path, headers?)` | GET 요청 |
| `post(path, body?, headers?)` | POST 요청 |
| `put(path, body?, headers?)` | PUT 요청 |
| `patch(path, body?, headers?)` | PATCH 요청 |
| `delete(path, headers?)` | DELETE 요청 |
| `postForm(path, fields)` | 폼 데이터 POST |
| `getJson(path)` | GET + JSON 파싱 |
| `assertStatus(path, status, method?)` | 상태 코드 확인 |

## 현재 테스트 현황

```
598 pass, 0 fail, 1071 expect() calls across 27 files

tests/validator_test.ts          - 14 tests
tests/helpers_test.ts            - 18 tests
tests/pagination_test.ts         -  8 tests
tests/upload_test.ts             -  6 tests
tests/cache_test.ts              - 12 tests
tests/middleware_test.ts          -  7 tests
tests/route_binding_test.ts      -  6 tests
tests/openapi_test.ts            -  7 tests
tests/queue_test.ts              - 15 tests
tests/redis_test.ts              - 15 tests
tests/scheduler_test.ts          - 16 tests
tests/feature_test.ts            - 30 tests
tests/feature2_test.ts           - 43 tests
tests/feature3_test.ts           - 61 tests
tests/query_builder_test.ts      - 26 tests
tests/query_builder_dialect_test.ts - 20 tests
tests/security_test.ts           - 14 tests
tests/form_helper_test.ts        - 22 tests
tests/html_helper_test.ts        - 12 tests
tests/text_helper_test.ts        - 10 tests
tests/inflector_helper_test.ts   -  5 tests
tests/e2e_test.ts                - 14 tests
tests/autoload_test.ts           -  7 tests
tests/security_profiler_test.ts  - 25 tests
```
