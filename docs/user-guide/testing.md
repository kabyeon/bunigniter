# 🧪 Testing

Uses Bun's built-in test runner (`bun:test`).

## Running Tests

```bash
bun test              # all tests
bun test --watch      # watch mode
bun test tests/validator_test.ts  # specific file
```

## Writing Unit Tests

```typescript
import { describe, test, expect } from "bun:test";
import { validate } from "../system/core/validator.ts";

describe("Validation", () => {
  test("email validation", () => {
    const { valid } = validate({ email: "bad" }, { email: "required|email" });
    expect(valid).toBe(false);
  });
});
```

## Test Helpers

```typescript
import { createTestDB, testRequest, parseJsonResponse } from "../system/core/test_helper.ts";

// In-memory DB
const db = await createTestDB();
await db`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`;
const result = await db`SELECT * FROM users`;
await db.close();
```

## E2E Tests (No Server Required)

Call the Router directly to test HTTP requests and responses:

```typescript
import { httpTest } from "../system/core/e2e_test.ts";
import { Router } from "../system/core/router.ts";

const router = new Router();
router.get("/users", userController, "index");
router.post("/users", userController, "store");

const test = httpTest(router);

// GET request
const res = await test.get("/users");
test.assertStatus(res, 200);

// POST request
const res2 = await test.post("/users", { name: "Test" });
test.assertJson(res2, { success: true });

// Redirect assertion
test.assertRedirect(await test.get("/old-path"), "/new-path");

// Body content assertion
test.assertBodyContains(await test.get("/users"), "Test");
```

### httpTest Methods

| Method | Description |
|--------|-------------|
| `get(path, headers?)` | GET request |
| `post(path, body?, headers?)` | POST request |
| `put(path, body?, headers?)` | PUT request |
| `patch(path, body?, headers?)` | PATCH request |
| `delete(path, headers?)` | DELETE request |
| `assertStatus(res, code)` | Assert status code |
| `assertJson(res, expected)` | Assert JSON response |
| `assertRedirect(res, location?)` | Assert redirect |
| `assertBodyContains(res, text)` | Assert body content |

## Integration Tests (Live Server)

```typescript
import { createIntegrationTestClient } from "../system/core/integration_test.ts";

const { client, close } = await createIntegrationTestClient(3999);

// HTTP requests
const res = await client.get("/users");
const json = await res.json();

// Form submission
await client.postForm("/login", { email: "test@test.com", password: "1234" });

// Status code assertion
await client.assertStatus("/users", 200);

close(); // must close
```

## IntegrationTestClient Methods

| Method | Description |
|--------|-------------|
| `get(path, headers?)` | GET request |
| `post(path, body?, headers?)` | POST request |
| `put(path, body?, headers?)` | PUT request |
| `patch(path, body?, headers?)` | PATCH request |
| `delete(path, headers?)` | DELETE request |
| `postForm(path, fields)` | POST form data |
| `getJson(path)` | GET + JSON parse |
| `assertStatus(path, status, method?)` | Assert status code |

## Current Test Status

```
620 pass, 0 fail, 1121 expect() calls across 28 files

tests/validator_test.ts            - 14 tests
tests/helpers_test.ts              - 53 tests
tests/pagination_test.ts           -  8 tests
tests/upload_test.ts               -  6 tests
tests/cache_test.ts                - 14 tests
tests/middleware_test.ts            -  7 tests
tests/route_binding_test.ts        -  6 tests
tests/openapi_test.ts              -  8 tests
tests/queue_test.ts                - 15 tests
tests/redis_test.ts                - 15 tests
tests/scheduler_test.ts            - 16 tests
tests/feature_test.ts              - 30 tests
tests/feature2_test.ts             - 43 tests
tests/feature3_test.ts             - 61 tests
tests/feature4_test.ts             - 56 tests
tests/query_builder_test.ts        - 56 tests
tests/query_builder_dialect_test.ts- 16 tests
tests/security_test.ts             - 30 tests
tests/form_helper_test.ts          - 28 tests
tests/html_helper_test.ts          - 16 tests
tests/text_helper_test.ts          - 18 tests
tests/inflector_helper_test.ts     - 19 tests
tests/e2e_test.ts                  - 14 tests
tests/autoload_test.ts             -  7 tests
tests/auto_router_test.ts          - 19 tests
tests/security_profiler_test.ts    - 24 tests
```
