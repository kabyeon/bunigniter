# 🔐 CSRF 보호

Bun 내장 `Bun.CSRF.generate()` / `Bun.CSRF.verify()` 기반 Double Submit Cookie 방식.

## 작동 방식

1. **GET 요청**: `Bun.CSRF.generate()`로 HMAC 서명 토큰을 생성하여 쿠키에 설정
   - 쿠키는 `HttpOnly=false` (JavaScript에서 읽을 수 있음)
   - 토큰에 nonce + 타임스탬프 + HMAC 서명 포함

2. **POST/PUT/PATCH/DELETE**: `Bun.CSRF.verify()`로 서명 + 만료 검증 후 Double Submit Cookie 검증

## 설정

```typescript
import { csrfMiddleware, generateCsrfToken, verifyCsrfToken } from "system/core/csrf.ts";

const config = {
  secret: process.env.CSRF_SECRET || "your-secret-key",  // 필수
  expiresIn: 86400000,    // 토큰 만료 (ms), 기본 24시간
  maxAge: 86400000,       // 검증 최대 수명 (ms)
  algorithm: "sha256",    // HMAC: sha256, sha384, sha512, sha512-256, blake2b256, blake2b512
  encoding: "base64url",  // 인코딩: base64, base64url, hex
  sessionId: "user-123",  // 세션 바인딩 (선택)
  cookieName: "csrf_token",
  tokenName: "csrf_token",
  sameSite: "Lax",        // Strict, Lax, None
  secure: false,          // HTTPS에서만
};
```

## 미들웨어 사용

```typescript
import { csrfMiddleware } from "system/core/csrf.ts";

// 라우트에 적용
router.post("/form", controller, "store", [csrfMiddleware]);

// 커스텀 설정
router.post("/api/data", controller, "store", [
  async (ctx) => csrfMiddleware({ ...ctx, config: { secret: "my-secret" } }),
]);
```

## 토큰 수동 생성/검증

```typescript
import { generateCsrfToken, verifyCsrfToken, verifyCsrfTokenSafe } from "system/core/csrf.ts";

// 생성
const token = generateCsrfToken({ secret: "my-secret", sessionId: "user-123" });

// 검증 (빈 문자열 시 throw)
const valid = verifyCsrfToken(token, { secret: "my-secret", sessionId: "user-123" });

// 안전한 검증 (빈 문자열/null/undefined 시 false)
const safe = verifyCsrfTokenSafe(token, { secret: "my-secret" });
```

## 뷰에서 사용

```html
<!-- 폼 hidden input -->
<form method="POST">
  <?= csrfField(csrfToken) ?>
  ...
</form>

<!-- AJAX 메타 태그 -->
<head>
  <?= csrfMeta(csrfToken) ?>
</head>

<!-- JavaScript에서 쿠키 읽기 -->
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

## Bun.CSRF 내장 기능

| 기능 | 설명 |
|------|------|
| HMAC 서명 | 비밀 키로 서명 → 변조 불가 |
| 만료 타임스탬프 | `expiresIn`/`maxAge`로 토큰 수명 제한 |
| 세션 바인딩 | `sessionId`로 특정 사용자에게 토큰 바인딩 |
| 다중 알고리즘 | SHA-256/384/512, BLAKE2b-256/512 |
| 다중 인코딩 | base64, base64url, hex |

## API

| 함수 | 설명 |
|------|------|
| `generateCsrfToken(config?)` | `Bun.CSRF.generate()` 래퍼 |
| `verifyCsrfToken(token, config?)` | `Bun.CSRF.verify()` 래퍼 |
| `verifyCsrfTokenSafe(token, config?)` | 에러 시 false 반환 안전 래퍼 |
| `getCsrfToken(request, config?)` | Double Submit Cookie 토큰 처리 |
| `csrfMiddleware(ctx)` | 라우트 미들웨어 |
| `csrfField(token)` | `<input type="hidden">` 생성 |
| `csrfMeta(token)` | `<meta name="csrf-token">` 생성 |
