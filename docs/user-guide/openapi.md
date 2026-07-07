# 📖 OpenAPI / Swagger

Auto-generates OpenAPI 3.0 specifications from your Router.

## Basic Usage

```typescript
import { OpenApiGenerator } from "system/core/openapi.ts";
import router from "app/config/routes.ts";

const generator = new OpenApiGenerator({
  info: { title: "My API", version: "1.0.0" },
  servers: [{ url: "http://localhost:3000" }],
});

// Generate OpenAPI spec
const spec = generator.generate(router);
```

## Customizing Route Documentation

```typescript
generator.describe("GET", "/users", {
  summary: "List users",
  tags: ["Users"],
  responses: {
    "200": { description: "User list" },
  },
});

generator.describe("POST", "/users", {
  summary: "Create a user",
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
// JSON endpoint
const specJson = generator.toJson(router);

// Swagger UI HTML
const html = generator.swaggerUiHtml("/api/docs/json");
```

Serve from a controller:

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

## Auto-generated Content

- Routes → paths auto-converted (`:id` → `{id}`)
- First path segment → tags auto-extracted
- POST/PUT → requestBody auto-added
- GET → `page` query parameter auto-added
- Default responses (200, 201, 404, 500, etc.) auto-generated
