# ⏱ Rate Limiting

Sliding window request rate limiting middleware.

## Basic Usage

```typescript
import { rateLimitMiddleware } from "system/core/rate_limit.ts";
router.use(rateLimitMiddleware);
```

Default: 100 requests per 60 seconds.

## Custom Configuration

```typescript
import { createRateLimitMiddleware } from "system/core/rate_limit.ts";

const apiLimiter = createRateLimitMiddleware({
  windowMs: 60,       // 60-second window
  maxRequests: 30,    // max 30 requests
  message: "Too many requests",
  statusCode: 429,
  headers: true,      // include X-RateLimit-* headers
});

router.group("/api", [apiLimiter], (apiRouter) => {
  apiRouter.resource("posts", postController);
});
```

## Response Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests per window |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Seconds until window reset |
| `Retry-After` | Seconds to wait when limited |

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `windowMs` | 60 | Time window (seconds) |
| `maxRequests` | 100 | Max requests per window |
| `keyGenerator` | IP address | Client identification function |
| `message` | "Too many requests..." | Rate limit exceeded message |
| `statusCode` | 429 | Rate limit exceeded HTTP status |
| `headers` | `true` | Include Rate Limit headers |

## Utilities

```typescript
import { cleanupRateLimitStore, resetRateLimitStore, resetRateLimitForKey } from "system/core/rate_limit.ts";

cleanupRateLimitStore();          // clean expired entries
resetRateLimitStore();            // full reset
resetRateLimitForKey("127.0.0.1"); // reset a specific key
```
