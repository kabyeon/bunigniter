# 🗄 Cache

Provides in-memory + file + Redis-based cache drivers.

## Basic Usage (Cache Manager)

```typescript
import { Cache } from "system/core/cache.ts";

Cache.put("key", "value", 600);     // 10-minute TTL
await Cache.get("key");              // "value"
await Cache.has("key");              // true
Cache.forever("key", "value");       // permanent storage
await Cache.forget("key");           // delete
await Cache.pull("key");             // retrieve and delete
Cache.flush();                       // delete all
```

## Remember (Callback Cache)

```typescript
const users = await Cache.remember("users:list", 300, async () => {
  return await userModel.findAll();  // runs and stores if not cached
});

const config = await Cache.rememberForever("app:config", async () => {
  return await loadConfig();
});
```

## Configuration

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

Or configure via `app/config/cache.ts`:

```typescript
export default {
  driver: "redis",
  redisUrl: "redis://localhost:6379",
  redisPrefix: "bunigniter:cache:",
};
```

## Using Drivers Directly

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
driver.gc();       // clean expired items
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
await driver.flush();  // delete all
```

- Share cache across distributed environments
- Uses Bun's built-in `RedisClient`
- Auto-manages TTL with Redis `SET ... EX`
- `RedisCacheDriver.closeAll()` — close connections

```env
# .env
CACHE_DRIVER=redis
REDIS_URL=redis://localhost:6379
```

## TTL

- `Cache.put(key, value, seconds)` — TTL in seconds
- `Cache.forever(key, value)` — no TTL (permanent)
- After TTL expiry, `get()` returns `null`
