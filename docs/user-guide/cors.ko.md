# 🌐 CORS 미들웨어

Cross-Origin Resource Sharing 미들웨어입니다.

## 기본 사용법

```typescript
import { corsMiddleware } from "system/core/cors.ts";
router.use(corsMiddleware);
```

기본값: 모든 오리진 허용 (`*`), 모든 메서드 허용

## 커스텀 설정

```typescript
import { createCorsMiddleware } from "system/core/cors.ts";

const customCors = createCorsMiddleware({
  origin: ["https://example.com", "https://app.example.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Total-Count"],
  credentials: true,
  maxAge: 86400,
});

router.use(customCors);
```

## 설정 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `origin` | `"*"` | 허용 오리진 |
| `methods` | GET,POST,PUT,DELETE,PATCH,OPTIONS | 허용 메서드 |
| `allowedHeaders` | Content-Type,Authorization,X-CSRF-Token | 허용 헤더 |
| `exposedHeaders` | 없음 | 노출할 응답 헤더 |
| `credentials` | `false` | 쿠키/인증 허용 |
| `maxAge` | 86400 | 프리플라이트 캐시 (초) |

## 동작

- **OPTIONS**: Preflight 응답 (204) + CORS 헤더
- **일반 요청**: 응답에 `Access-Control-Allow-Origin` 헤더 추가
