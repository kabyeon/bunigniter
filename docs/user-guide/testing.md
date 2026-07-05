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

## 통합 테스트

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
81 pass, 0 fail, 145 expect() calls across 9 files

tests/validator_test.ts      - 14 tests
tests/helpers_test.ts        - 18 tests
tests/pagination_test.ts     -  8 tests
tests/upload_test.ts         -  6 tests
tests/cache_test.ts          - 14 tests
tests/middleware_test.ts     -  7 tests
tests/route_binding_test.ts  -  6 tests
tests/openapi_test.ts        -  8 tests
```
