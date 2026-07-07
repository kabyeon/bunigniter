# 🌐 CORS Middleware

Cross-Origin Resource Sharing middleware.

## Basic Usage

```typescript
import { corsMiddleware } from "system/core/cors.ts";
router.use(corsMiddleware);
```

Default: allow all origins (`*`), allow all methods.

## Custom Configuration

```typescript
import { createCorsMiddleware } from "system/core/cors.ts";

const customCors = createCorsMiddleware({
  origin: ["https://example.com", "https://app.example.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Total-Count"],
  credentials: true,
  maxAge: 86400,
});

router.use(customCors);
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `origin` | `"*"` | Allowed origins |
| `methods` | GET,POST,PUT,DELETE,PATCH,OPTIONS | Allowed methods |
| `allowedHeaders` | Content-Type,Authorization,X-CSRF-Token | Allowed headers |
| `exposedHeaders` | none | Response headers to expose |
| `credentials` | `false` | Allow cookies/credentials |
| `maxAge` | 86400 | Preflight cache (seconds) |

## Behavior

- **OPTIONS**: Preflight response (204) + CORS headers
- **Normal requests**: Adds `Access-Control-Allow-Origin` header to the response
