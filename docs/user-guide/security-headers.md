# 🛡 Security Headers Middleware

Applies OWASP-recommended security headers to prevent XSS, clickjacking, MIME sniffing, and information leakage.

## Basic Usage

```typescript
import { securityHeadersMiddleware } from "system/core/security_headers.ts";

// Apply as global middleware
router.use(securityHeadersMiddleware);
```

The following headers are automatically added to every response:

| Header | Default | Description |
|--------|---------|-------------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy browser XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restricts browser features |

Additionally, `X-Powered-By` and `Server` headers are automatically removed to prevent server information leakage.

## Custom Configuration

```typescript
import { createSecurityHeadersMiddleware } from "system/core/security_headers.ts";

// HSTS (HTTPS environment)
router.use(createSecurityHeadersMiddleware({
  hsts: "max-age=31536000; includeSubDomains; preload",
}));

// CSP
router.use(createSecurityHeadersMiddleware({
  csp: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'",
}));

// All security headers + HSTS + CSP
router.use(createSecurityHeadersMiddleware({
  frameOptions: "DENY",
  hsts: "max-age=31536000; includeSubDomains",
  csp: "default-src 'self'",
  permissionsPolicy: "camera=(), microphone=(), geolocation=(self)",
}));
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `contentTypeOptions` | `"nosniff"` | `false` → disable |
| `frameOptions` | `"SAMEORIGIN"` | `"DENY"` or `false` |
| `xssProtection` | `"1; mode=block"` | For legacy browsers |
| `referrerPolicy` | `"strict-origin-when-cross-origin"` | Referrer restriction |
| `permissionsPolicy` | `"camera=(), microphone=(), geolocation=()"` | Feature restriction |
| `hsts` | `false` (disabled) | Enable only over HTTPS |
| `csp` | `false` (disabled) | Content source restriction |
| `coop` | `false` | Cross-Origin-Opener-Policy |
| `coep` | `false` | Cross-Origin-Embedder-Policy |
| `corp` | `false` | Cross-Origin-Resource-Policy |

## Disabling Individual Headers

```typescript
// Disable X-Frame-Options and X-XSS-Protection
router.use(createSecurityHeadersMiddleware({
  frameOptions: false,
  xssProtection: false,
}));
```

## CI3 ↔ BunIgniter Comparison

| CodeIgniter 3 | BunIgniter |
|---------------|------------|
| `$this->output->set_header('X-Frame-Options: DENY')` | `createSecurityHeadersMiddleware({ frameOptions: "DENY" })` |
| Manual header setting | Middleware batch application |
| N/A | Automatic CSP, HSTS, Permissions-Policy support |
