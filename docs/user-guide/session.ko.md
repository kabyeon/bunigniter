# 🔑 세션

`SessionDriver` 인터페이스 기반으로 드라이버를 교체할 수 있습니다.

## 설정

```typescript
// app/config/app.ts
session: {
  driver: "file",              // "memory" | "file" | "redis"
  cookieName: "bunigniter_session",
  expiration: 7200,            // 2시간 (초)
  path: "./storage/sessions",  // file 드라이버 경로
}
```

## 사용법

모든 드라이버가 동일한 API를 제공합니다:

```typescript
import { createSession } from "system/core/session_manager.ts";

const session = await createSession(request, { driver: "file" });

session.set("userId", 42);
session.get("userId");         // 42
session.has("userId");         // true
session.remove("userId");
session.all();                 // { ... }
session.flash("msg", "저장됨");  // 1회성
session.getFlash("msg");       // "저장됨" (조회 후 자동 삭제)
session.save();                // 명시적 저장
session.destroy();             // 파기
session.getId();               // 세션 ID
session.getCookieHeader();     // 쿠키 헤더
```

> **참고**: `createSession`은 비동기 함수입니다. Redis 드라이버 사용 시 `await`이 필요합니다.

## 드라이버

### MemorySession (인메모리)

```typescript
import { MemorySession } from "system/core/memory_session.ts";
const session = new MemorySession(request);
```

- 빠르지만 서버 재시작 시 초기화

### FileSession (파일 기반, 기본)

```typescript
import { FileSession } from "system/core/file_session.ts";
const session = new FileSession(request);
```

- `storage/sessions/` 에 JSON 파일로 저장
- 서버 재시작해도 유지
- GC: `FileSession.gc(7200)` — 만료된 세션 정리
- 카운트: `FileSession.count()` — 활성 세션 수

### RedisSession (Redis 기반)

```typescript
import { RedisSession } from "system/core/redis_session.ts";
const session = new RedisSession(request, {
  redisUrl: "redis://localhost:6379",
  expiration: 7200,
});
await session.load(); // 반드시 load() 호출
```

- 분산 환경에서 세션 공유 가능
- Bun 내장 `RedisClient` 사용
- TTL 자동 관리 (Redis EXPIRE)
- 비동기 API: `saveAsync()`, `destroyAsync()`, `getCookieHeaderAsync()`
- 카운트: `await RedisSession.count()` — 활성 세션 수
- 정리: `RedisSession.closeAll()` — 연결 종료

```env
# .env
REDIS_URL=redis://localhost:6379
SESSION_DRIVER=redis
```

### 세션 매니저 (자동 선택)

```typescript
import { createSession } from "system/core/session_manager.ts";
const session = await createSession(request); // 설정에 따라 자동 선택
```
