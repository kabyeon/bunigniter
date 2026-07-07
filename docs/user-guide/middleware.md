# 🛡 Middleware

## Basic Usage

```typescript
import type { MiddlewareFn } from "system/core/middleware.ts";

export const authMiddleware: MiddlewareFn = async ({ request, response, next }) => {
  const token = request.headers.get("authorization");
  if (!token) return response.redirect("/login");
  return next();
};
```

## Applying to Routes

```typescript
// Global
router.use(loggingMiddleware);

// Resource routes
router.resource("admin", adminController, [authGuard]);

// Route groups
router.group("/api", [authMiddleware], (router) => {
  router.resource("posts", postController);
});
```

## Pipeline

```
Request → Global Middleware → Route Middleware → Controller
          ↓ next()           ↓ next()
```

- `next()` call → proceeds to next middleware
- Returning `Response` → pipeline stops (request blocked)

## Built-in Middleware

- `csrfMiddleware` — CSRF protection ([CSRF guide](csrf.md))
- `authGuard` — Requires login ([Auth guide](auth.md))
- `guestGuard` — Guests only ([Auth guide](auth.md))
- `corsMiddleware` — CORS handling ([CORS guide](cors.md))
- `rateLimitMiddleware` — Rate limiting ([Rate Limit guide](rate-limit.md))
- `securityHeadersMiddleware` — Security headers ([Security Headers guide](security-headers.md))

## Custom Security Headers Middleware

```typescript
import { createSecurityHeadersMiddleware } from "system/core/security_headers.ts";

// HSTS + CSP + DENY
router.use(createSecurityHeadersMiddleware({
  frameOptions: "DENY",
  hsts: "max-age=31536000; includeSubDomains",
  csp: "default-src 'self'; script-src 'self'",
}));
```

[→ Security Headers guide](security-headers.md)
