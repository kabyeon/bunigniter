# 🍪 쿠키 헬퍼

`Bun.Cookie` / `Bun.CookieMap` 내장 기능을 활용한 쿠키 유틸리티입니다.

CI3의 `$this->input->cookie()` / `$this->input->set_cookie()` 대체.

## 쿠키 읽기

```typescript
import { getCookie, getCookies, hasCookie } from "system/core/cookie.ts";

// 단일 쿠키
const theme = getCookie(request, "theme");  // "dark" | null

// 전체 쿠키
const all = getCookies(request);            // { theme: "dark", lang: "ko" }

// 존재 여부
if (hasCookie(request, "session")) { ... }
```

## 쿠키 설정

```typescript
import { setCookie, deleteCookie, setCookies } from "system/core/cookie.ts";

// 기본
const header = setCookie("theme", "dark");
// → "theme=dark; Path=/; SameSite=lax"

// 전체 옵션
const header = setCookie("session", "abc123", {
  httpOnly: true,
  secure: true,
  maxAge: 3600,
  sameSite: "strict",
  domain: "example.com",
  path: "/admin",
});

// 응답에 적용
return new Response(body, {
  headers: { "Set-Cookie": header },
});

// 삭제
const deleteHeader = deleteCookie("session");

// 여러 쿠키
const headers = setCookies([
  { name: "a", value: "1" },
  { name: "b", value: "2", options: { maxAge: 3600 } },
]);
```

## 쿠키 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `domain` | - | 도메인 |
| `path` | `/` | 경로 |
| `expires` | - | 만료 시각 |
| `maxAge` | - | 최대 수명 (초) |
| `secure` | `false` | HTTPS에서만 |
| `httpOnly` | `false` | JS 접근 불가 |
| `sameSite` | `"lax"` | SameSite 정책 |
| `partitioned` | `false` | CHIPS |

## 쿠키 파싱

```typescript
import { parseCookie, isCookieExpired } from "system/core/cookie.ts";

const parsed = parseCookie("session=abc; Path=/; HttpOnly");
// { name: "session", value: "abc", httpOnly: true, ... }

const expired = isCookieExpired("name=val; Max-Age=0");
```

## Bun.Cookie 내장 사용

이 모듈은 Bun의 `Bun.Cookie`, `Bun.CookieMap` 내장 API를 래핑합니다.
