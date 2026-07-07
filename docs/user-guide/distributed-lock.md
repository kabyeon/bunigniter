# 🔒 Distributed Lock

Prevents concurrent execution across multiple servers/processes using Redis-based distributed locking.

Uses Bun's built-in `RedisClient`.

## Configuration

```typescript
import { DistributedLock } from "system/core/distributed_lock.ts";

// Memory driver (development/test)
DistributedLock.configure({ driver: "memory" });

// Redis driver (production)
DistributedLock.configure({
  driver: "redis",
  redisUrl: "redis://localhost:6379",
});
```

Environment variables:

- `LOCK_DRIVER` — "memory" | "redis" (default "memory")
- `REDIS_URL` — Redis connection URL
- `LOCK_DEFAULT_TTL` — default lock TTL in ms (default 60000)
- `LOCK_RETRY_INTERVAL` — retry interval in ms (default 200)
- `LOCK_MAX_RETRIES` — maximum retries (default 50)

## Basic Usage

```typescript
// Acquire lock
const lock = await DistributedLock.acquire("my-resource");
if (lock.acquired) {
  try {
    await doWork();
  } finally {
    await DistributedLock.release(lock);
  }
}

// Wrapper pattern (recommended)
await DistributedLock.run("my-resource", async () => {
  await doWork();
});
// Lock is automatically released

// Acquire lock with retry
const lock = await DistributedLock.acquireWithRetry("my-resource", 30000, {
  retryInterval: 500,
  maxRetries: 20,
});
```

## Distributed Lock for Scheduled Jobs

```typescript
import { Scheduler } from "system/core/scheduler.ts";

// Enable distributed locking
Scheduler.enableDistributedLock("redis");

Scheduler.add("cleanup", "0 * * * *", async () => {
  // Only one server executes this
  await cleanupTempFiles();
});
```

Or manually:

```typescript
Scheduler.add("cleanup", "0 * * * *", async () => {
  return DistributedLock.runScheduled("cleanup", async () => {
    await cleanupTempFiles();
  });
});
```

## Lock Renewal (Long-Running Tasks)

```typescript
await DistributedLock.run("long-task", async () => {
  // When autoRenew is enabled, the lock is automatically renewed at 1/3 of TTL intervals
  await longRunningTask();
}, { autoRenew: true, ttlMs: 300000 });
```

## Drivers

### MemoryLockDriver (Development/Test)

- Single process only
- No external dependencies

### RedisLockDriver (Production)

- Multi-server/process support
- `SET NX EX` atomic lock acquisition
- Lua script for atomic lock release/renewal
- Uses Bun's built-in `RedisClient.send("EVAL", ...)`

## API

| Method | Description |
|--------|-------------|
| `acquire(key, ttl?)` | Acquire lock |
| `release(lock)` | Release lock |
| `renew(lock, ttl?)` | Renew lock |
| `isLocked(key)` | Check lock status |
| `getTtl(key)` | Get lock TTL |
| `acquireWithRetry(key, ttl?, options?)` | Acquire lock with retry |
| `run(key, callback, options?)` | Wrapper pattern (auto acquire/release) |
| `runScheduled(jobName, callback, options?)` | Wrapper for cron jobs |
| `releaseAll(prefix?)` | Release all locks |
