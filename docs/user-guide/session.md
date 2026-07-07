# 🔑 Sessions

Drivers can be swapped based on the `SessionDriver` interface.

## Configuration

```typescript
// app/config/app.ts
session: {
  driver: "file",              // "memory" | "file" | "redis"
  cookieName: "bunigniter_session",
  expiration: 7200,            // 2 hours (seconds)
  path: "./storage/sessions",  // file driver path
}
```

## Usage

All drivers provide the same API:

```typescript
import { createSession } from "system/core/session_manager.ts";

const session = await createSession(request, { driver: "file" });

session.set("userId", 42);
session.get("userId");         // 42
session.has("userId");         // true
session.remove("userId");
session.all();                 // { ... }
session.flash("msg", "Saved");  // One-time flash data
session.getFlash("msg");       // "Saved" (auto-deleted after read)
session.save();                // Explicit save
session.destroy();             // Destroy
session.getId();               // Session ID
session.getCookieHeader();     // Cookie header
```

> **Note**: `createSession` is an async function. `await` is required when using the Redis driver.

## Drivers

### MemorySession (in-memory)

```typescript
import { MemorySession } from "system/core/memory_session.ts";
const session = new MemorySession(request);
```

- Fast but resets on server restart

### FileSession (file-based, default)

```typescript
import { FileSession } from "system/core/file_session.ts";
const session = new FileSession(request);
```

- Stores as JSON files in `storage/sessions/`
- Persists across server restarts
- GC: `FileSession.gc(7200)` — clean expired sessions
- Count: `FileSession.count()` — active session count

### RedisSession (Redis-based)

```typescript
import { RedisSession } from "system/core/redis_session.ts";
const session = new RedisSession(request, {
  redisUrl: "redis://localhost:6379",
  expiration: 7200,
});
await session.load(); // must call load()
```

- Enables session sharing in distributed environments
- Uses Bun's built-in `RedisClient`
- Automatic TTL management (Redis EXPIRE)
- Async API: `saveAsync()`, `destroyAsync()`, `getCookieHeaderAsync()`
- Count: `await RedisSession.count()` — active session count
- Cleanup: `RedisSession.closeAll()` — close connections

```env
# .env
REDIS_URL=redis://localhost:6379
SESSION_DRIVER=redis
```

### Session Manager (auto-select)

```typescript
import { createSession } from "system/core/session_manager.ts";
const session = await createSession(request); // auto-selected based on config
```
