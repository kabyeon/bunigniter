# 🗄 캐시

인메모리 + 파일 기반 캐시 드라이버를 제공합니다.

## 기본 사용법 (Cache 매니저)

```typescript
import { Cache } from "system/core/cache.ts";

Cache.put("key", "value", 600);     // 10분 TTL
Cache.get("key");                    // "value"
Cache.has("key");                    // true
Cache.forever("key", "value");       // 영구 저장
Cache.forget("key");                 // 삭제
Cache.pull("key");                   // 조회 후 삭제
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
  driver: "memory",    // "memory" | "file"
  prefix: "app:",
  defaultTtl: 3600,
  path: "./storage/cache",
});
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

## TTL

- `Cache.put(key, value, seconds)` — 초 단위 TTL
- `Cache.forever(key, value)` — TTL 없음 (영구)
- TTL 만료 후 `get()` 은 `null` 반환
