# 📖 OpenAPI / Swagger

Router에서 OpenAPI 3.0 스펙을 자동 생성합니다.

## 기본 사용법

```typescript
import { OpenApiGenerator } from "system/core/openapi.ts";
import router from "app/config/routes.ts";

const generator = new OpenApiGenerator({
  info: { title: "My API", version: "1.0.0" },
  servers: [{ url: "http://localhost:3000" }],
});

// OpenAPI 스펙 생성
const spec = generator.generate(router);
```

## 라우트 문서 커스터마이징

```typescript
generator.describe("GET", "/users", {
  summary: "사용자 목록 조회",
  tags: ["Users"],
  responses: {
    "200": { description: "사용자 목록" },
  },
});

generator.describe("POST", "/users", {
  summary: "사용자 생성",
  tags: ["Users"],
  requestBody: {
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["name", "email"],
          properties: {
            name: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    },
  },
});
```

## Swagger UI

```typescript
// JSON 엔드포인트
const specJson = generator.toJson(router);

// Swagger UI HTML
const html = generator.swaggerUiHtml("/api/docs/json");
```

컨트롤러에서 제공:

```typescript
import { OpenApiGenerator } from "system/core/openapi.ts";

async docs({ request, response }: Context) {
  const html = generator.swaggerUiHtml("/api/docs/json");
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

async docsJson({ request, response }: Context) {
  const json = generator.toJson(router);
  return this.json(JSON.parse(json));
}
```

## 자동 생성 내용

- 라우트 → paths 자동 변환 (`:id` → `{id}`)
- 경로 첫 세그먼트 → tags 자동 추출
- POST/PUT → requestBody 자동 추가
- GET → page 쿼리 파라미터 자동 추가
- 기본 응답 (200, 201, 404, 500 등) 자동 생성
