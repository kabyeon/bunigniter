# 🍪 Cookie Helper

Cookie utilities built on `Bun.Cookie` / `Bun.CookieMap`.

Replaces CI3's `$this->input->cookie()` / `$this->input->set_cookie()`.

## Reading Cookies

```typescript
import { getCookie, getCookies, hasCookie } from "system/core/cookie.ts";

// Single cookie
const theme = getCookie(request, "theme");  // "dark" | null

// All cookies
const all = getCookies(request);            // { theme: "dark", lang: "ko" }

// Check existence
if (hasCookie(request, "session")) { ... }
```

## Setting Cookies

```typescript
import { setCookie, deleteCookie, setCookies } from "system/core/cookie.ts";

// Basic
const header = setCookie("theme", "dark");
// → "theme=dark; Path=/; SameSite=lax"

// Full options
const header = setCookie("session", "abc123", {
  httpOnly: true,
  secure: true,
  maxAge: 3600,
  sameSite: "strict",
  domain: "example.com",
  path: "/admin",
});

// Apply to response
return new Response(body, {
  headers: { "Set-Cookie": header },
});

// Delete
const deleteHeader = deleteCookie("session");

// Multiple cookies
const headers = setCookies([
  { name: "a", value: "1" },
  { name: "b", value: "2", options: { maxAge: 3600 } },
]);
```

## Cookie Options

| Option | Default | Description |
|--------|---------|-------------|
| `domain` | - | Domain |
| `path` | `/` | Path |
| `expires` | - | Expiration time |
| `maxAge` | - | Maximum age (seconds) |
| `secure` | `false` | HTTPS only |
| `httpOnly` | `false` | JS inaccessible |
| `sameSite` | `"lax"` | SameSite policy |
| `partitioned` | `false` | CHIPS |

## Parsing Cookies

```typescript
import { parseCookie, isCookieExpired } from "system/core/cookie.ts";

const parsed = parseCookie("session=abc; Path=/; HttpOnly");
// { name: "session", value: "abc", httpOnly: true, ... }

const expired = isCookieExpired("name=val; Max-Age=0");
```

## Using Bun.Cookie Natively

This module wraps Bun's built-in `Bun.Cookie` and `Bun.CookieMap` APIs.
