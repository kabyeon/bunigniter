# 🛡 보안 헤더 미들웨어

OWASP 권장 보안 헤더를 일괄 적용하여 XSS, 클릭재킹, MIME 스니핑, 정보 유출을 방지합니다.

## 기본 사용법

```typescript
import { securityHeadersMiddleware } from "system/core/security_headers.ts";

// 글로벌 미들웨어로 적용
router.use(securityHeadersMiddleware);
```

모든 응답에 다음 헤더가 자동 추가됩니다:

| 헤더 | 기본값 | 설명 |
|------|--------|------|
| `X-Content-Type-Options` | `nosniff` | MIME 스니핑 방지 |
| `X-Frame-Options` | `SAMEORIGIN` | 클릭재킹 방지 |
| `X-XSS-Protection` | `1; mode=block` | 레거시 브라우저 XSS 필터 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 리퍼러 정보 제한 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 브라우저 기능 제한 |

또한 `X-Powered-By`, `Server` 헤더를 자동 제거하여 서버 정보 유출을 방지합니다.

## 커스텀 설정

```typescript
import { createSecurityHeadersMiddleware } from "system/core/security_headers.ts";

// HSTS (HTTPS 환경)
router.use(createSecurityHeadersMiddleware({
  hsts: "max-age=31536000; includeSubDomains; preload",
}));

// CSP
router.use(createSecurityHeadersMiddleware({
  csp: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'",
}));

// 모든 보안 헤더 + HSTS + CSP
router.use(createSecurityHeadersMiddleware({
  frameOptions: "DENY",
  hsts: "max-age=31536000; includeSubDomains",
  csp: "default-src 'self'",
  permissionsPolicy: "camera=(), microphone=(), geolocation=(self)",
}));
```

## 설정 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `contentTypeOptions` | `"nosniff"` | `false` → 비활성화 |
| `frameOptions` | `"SAMEORIGIN"` | `"DENY"` 또는 `false` |
| `xssProtection` | `"1; mode=block"` | 레거시 브라우저용 |
| `referrerPolicy` | `"strict-origin-when-cross-origin"` | 리퍼러 제한 |
| `permissionsPolicy` | `"camera=(), microphone=(), geolocation=()"` | 기능 제한 |
| `hsts` | `false` (비활성화) | HTTPS에서만 활성화 |
| `csp` | `false` (비활성화) | 콘텐츠 소스 제한 |
| `coop` | `false` | Cross-Origin-Opener-Policy |
| `coep` | `false` | Cross-Origin-Embedder-Policy |
| `corp` | `false` | Cross-Origin-Resource-Policy |

## 개별 헤더 비활성화

```typescript
// X-Frame-Options, X-XSS-Protection 비활성화
router.use(createSecurityHeadersMiddleware({
  frameOptions: false,
  xssProtection: false,
}));
```

## CI3 ↔ BunIgniter 대조표

| CodeIgniter 3 | BunIgniter |
|---------------|-----------|
| `$this->output->set_header('X-Frame-Options: DENY')` | `createSecurityHeadersMiddleware({ frameOptions: "DENY" })` |
| 수동 헤더 설정 | 미들웨어 일괄 적용 |
| N/A | CSP, HSTS, Permissions-Policy 자동 지원 |
