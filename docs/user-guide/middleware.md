# 🛡 미들웨어

## 기본 사용법

```typescript
import type { MiddlewareFn } from "system/core/middleware.ts";

export const authMiddleware: MiddlewareFn = async ({ request, response, next }) => {
  const token = request.headers.get("authorization");
  if (!token) return response.redirect("/login");
  return next();
};
```

## 라우트에 적용

```typescript
// 글로벌
router.use(loggingMiddleware);

// 리소스 라우트
router.resource("admin", adminController, [authGuard]);

// 라우트 그룹
router.group("/api", [authMiddleware], (router) => {
  router.resource("posts", postController);
});
```

## 파이프라인

```
요청 → 글로벌 미들웨어 → 라우트 미들웨어 → 컨트롤러
         ↓ next()          ↓ next()
```

- `next()` 호출 → 다음 미들웨어로 진행
- `Response` 반환 → 파이프라인 중단 (요청 차단)

## 내장 미들웨어

- `csrfMiddleware` — CSRF 보호 ([CSRF 가이드](csrf.md))
- `authGuard` — 로그인 필요 ([Auth 가이드](auth.md))
- `guestGuard` — 게스트 전용 ([Auth 가이드](auth.md))
- `corsMiddleware` — CORS 처리 ([CORS 가이드](cors.md))
- `rateLimitMiddleware` — 요청 제한 ([Rate Limit 가이드](rate-limit.md))
