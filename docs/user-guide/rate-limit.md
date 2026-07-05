# ⏱ Rate Limiting

슬라이딩 윈도우 방식의 요청 빈도 제한 미들웨어입니다.

## 기본 사용법

```typescript
import { rateLimitMiddleware } from "system/core/rate_limit.ts";
router.use(rateLimitMiddleware);
```

기본값: 60초당 100회 요청

## 커스텀 설정

```typescript
import { createRateLimitMiddleware } from "system/core/rate_limit.ts";

const apiLimiter = createRateLimitMiddleware({
  windowMs: 60,       // 60초 윈도우
  maxRequests: 30,    // 최대 30회
  message: "요청이 너무 많습니다",
  statusCode: 429,
  headers: true,      // X-RateLimit-* 헤더 포함
});

router.group("/api", [apiLimiter], (apiRouter) => {
  apiRouter.resource("posts", postController);
});
```

## 응답 헤더

| 헤더 | 설명 |
|------|------|
| `X-RateLimit-Limit` | 윈도우 내 최대 요청 수 |
| `X-RateLimit-Remaining` | 남은 요청 수 |
| `X-RateLimit-Reset` | 윈도우 리셋까지 남은 초 |
| `Retry-After` | 제한 초과 시 재시도 대기 초 |

## 설정 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `windowMs` | 60 | 시간 윈도우 (초) |
| `maxRequests` | 100 | 윈도우 내 최대 요청 |
| `keyGenerator` | IP 주소 | 클라이언트 식별 함수 |
| `message` | "Too many requests..." | 제한 초과 메시지 |
| `statusCode` | 429 | 제한 초과 HTTP 상태 |
| `headers` | `true` | Rate Limit 헤더 포함 |

## 유틸리티

```typescript
import { cleanupRateLimitStore, resetRateLimitStore, resetRateLimitForKey } from "system/core/rate_limit.ts";

cleanupRateLimitStore();          // 만료 항목 정리
resetRateLimitStore();            // 전체 초기화
resetRateLimitForKey("127.0.0.1"); // 특정 키 초기화
```
