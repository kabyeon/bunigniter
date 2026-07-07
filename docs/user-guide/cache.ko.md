# 🗄 캐시

인메모리 + 파일 + Redis 기반 캐시 드라이버를 제공합니다.

## 기본 사용법 (Cache 매니저)

```typescript
import { Cache } from "system/core/cache.ts";

Cache.put("key", "value", 600);     // 10분 TTL
await Cache.get("key");              // "value"
await Cache.has("key");              // true
Cache.forever("key", "value");       // 영구 저장
await Cache.forget("key");           // 삭제
await Cache.pull("key");             // 조회 후 삭제
Cache.flush();                       // 전체 삭제
```

## Remember (콜백 캐시)

```typescript
const users = await Cache.remember("users:list", 300, async () => {
  return await userModel.findAll();  // 캐시 없으면 실행 후 저장
});

const config = await Cache.rememberForever("app:config", async () => {
  return await loadConfig();
});
```

## 설정

```typescript
Cache.configure({
  driver: "memory",    // "memory" | "file" | "redis"
  prefix: "app:",
  defaultTtl: 3600,
  path: "./storage/cache",
  redisUrl: "redis://localhost:6379",
  redisPrefix: "bunigniter:cache:",
});
```

또는 `app/config/cache.ts`에서 설정합니다:

```typescript
export default {
  driver: "redis",
  redisUrl: "redis://localhost:6379",
  redisPrefix: "bunigniter:cache:",
};
```

## 드라이버 직접 사용

### MemoryCacheDriver

```typescript
import { MemoryCacheDriver } from "system/core/cache.ts";
const driver = new MemoryCacheDriver({ prefix: "test:" });
driver.set("key", "val", 60);
driver.get("key"); // "val"
```

### FileCacheDriver

```typescript
import { FileCacheDriver } from "system/core/cache.ts";
const driver = new FileCacheDriver({ path: "./storage/cache" });
driver.set("key", { data: 123 }, 300);
driver.get("key"); // { data: 123 }
driver.gc();       // 만료 항목 정리
```

### RedisCacheDriver

```typescript
import { RedisCacheDriver } from "system/core/redis_cache.ts";
const driver = new RedisCacheDriver({
  redisUrl: "redis://localhost:6379",
  keyPrefix: "myapp:cache:",
});
await driver.set("key", { data: 123 }, 300);
const val = await driver.get("key"); // { data: 123 }
await driver.flush();  // 전체 삭제
```

- 분산 환경에서 캐시 공유 가능
- Bun 내장 `RedisClient` 사용
- Redis `SET ... EX`로 TTL 자동 관리
- `RedisCacheDriver.closeAll()` — 연결 종료

```env
# .env
CACHE_DRIVER=redis
REDIS_URL=redis://localhost:6379
```

## TTL

- `Cache.put(key, value, seconds)` — 초 단위 TTL
- `Cache.forever(key, value)` — TTL 없음 (영구)
- TTL 만료 후 `get()` 은 `null` 반환
