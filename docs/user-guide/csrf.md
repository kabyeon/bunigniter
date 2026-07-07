# 🔐 CSRF Protection

Double Submit Cookie method based on Bun's built-in `Bun.CSRF.generate()` / `Bun.CSRF.verify()`.

## How It Works

1. **GET request**: Generates an HMAC-signed token via `Bun.CSRF.generate()` and sets it as a cookie
   - Cookie is `HttpOnly=false` (readable from JavaScript)
   - Token includes nonce + timestamp + HMAC signature

2. **POST/PUT/PATCH/DELETE**: Validates signature and expiration via `Bun.CSRF.verify()`, then performs Double Submit Cookie verification

## Configuration

```typescript
import { csrfMiddleware, generateCsrfToken, verifyCsrfToken } from "system/core/csrf.ts";

const config = {
  secret: process.env.CSRF_SECRET || "your-secret-key",  // required
  expiresIn: 86400000,    // Token expiration (ms), default 24 hours
  maxAge: 86400000,       // Max verification lifetime (ms)
  algorithm: "sha256",    // HMAC: sha256, sha384, sha512, sha512-256, blake2b256, blake2b512
  encoding: "base64url",  // Encoding: base64, base64url, hex
  sessionId: "user-123",  // Session binding (optional)
  cookieName: "csrf_token",
  tokenName: "csrf_token",
  sameSite: "Lax",        // Strict, Lax, None
  secure: false,          // HTTPS only
};
```

## Middleware Usage

```typescript
import { csrfMiddleware } from "system/core/csrf.ts";

// Apply to route
router.post("/form", controller, "store", [csrfMiddleware]);

// Custom configuration
router.post("/api/data", controller, "store", [
  async (ctx) => csrfMiddleware({ ...ctx, config: { secret: "my-secret" } }),
]);
```

## Manual Token Generate/Verify

```typescript
import { generateCsrfToken, verifyCsrfToken, verifyCsrfTokenSafe } from "system/core/csrf.ts";

// Generate
const token = generateCsrfToken({ secret: "my-secret", sessionId: "user-123" });

// Verify (throws on empty string)
const valid = verifyCsrfToken(token, { secret: "my-secret", sessionId: "user-123" });

// Safe verify (returns false on empty/null/undefined)
const safe = verifyCsrfTokenSafe(token, { secret: "my-secret" });
```

## Usage in Views

```html
<!-- Form hidden input -->
<form method="POST">
  <?= csrfField(csrfToken) ?>
  ...
</form>

<!-- AJAX meta tag -->
<head>
  <?= csrfMeta(csrfToken) ?>
</head>

<!-- JavaScript reading cookie -->
<script>
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];

  fetch('/api/data', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
</script>
```

## Bun.CSRF Built-in Features

| Feature | Description |
|---------|-------------|
| HMAC signing | Signed with secret key → tamper-proof |
| Expiration timestamp | `expiresIn`/`maxAge` limits token lifetime |
| Session binding | `sessionId` binds token to specific user |
| Multiple algorithms | SHA-256/384/512, BLAKE2b-256/512 |
| Multiple encodings | base64, base64url, hex |

## API

| Function | Description |
|----------|-------------|
| `generateCsrfToken(config?)` | Wrapper for `Bun.CSRF.generate()` |
| `verifyCsrfToken(token, config?)` | Wrapper for `Bun.CSRF.verify()` |
| `verifyCsrfTokenSafe(token, config?)` | Safe wrapper returning false on error |
| `getCsrfToken(request, config?)` | Double Submit Cookie token handling |
| `csrfMiddleware(ctx)` | Route middleware |
| `csrfField(token)` | Generates `<input type="hidden">` |
| `csrfMeta(token)` | Generates `<meta name="csrf-token">` |
