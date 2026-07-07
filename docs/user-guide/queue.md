# ⏳ Queue / Job System

Background job queue system. Supports memory + Redis drivers.

## Configuration

```typescript
// app/config/queue.ts
export default {
  driver: "memory",       // "memory" | "redis"
  defaultQueue: "default",
  defaultMaxRetries: 3,
  jobTimeout: 60000,      // ms
  redisUrl: "redis://localhost:6379",
  batchSize: 10,
  pollInterval: 1000,     // ms
};
```

```env
# .env
QUEUE_DRIVER=memory
QUEUE_DEFAULT=default
QUEUE_MAX_RETRIES=3
QUEUE_TIMEOUT=60000
```

## Registering Job Handlers

```typescript
import { Queue } from "system/core/queue.ts";
import { Email } from "system/core/email.ts";

Queue.register("SendEmailJob", async (data) => {
  const mailer = new Email();
  await mailer.send({
    to: data.to,
    subject: data.subject,
    html: data.html,
  });
});

// Batch registration
Queue.registerMany({
  ProcessVideoJob: async (data) => { /* ... */ },
  GenerateReportJob: async (data) => { /* ... */ },
});
```

## Dispatching Jobs

```typescript
// Immediate execution
await Queue.push("SendEmailJob", {
  to: "user@test.com",
  subject: "Welcome",
  html: "<h1>Hello!</h1>",
});

// Delayed execution (60 seconds later)
await Queue.later(60, "SendEmailJob", { to: "user@test.com" });

// Schedule at a specific time
await Queue.scheduleAt(new Date("2025-12-25T09:00:00"), "SendReportJob", {});

// Push to a specific queue
await Queue.push("ProcessVideoJob", { videoId: 123 }, "videos");
```

## Running the Worker

```typescript
// Start the default queue worker
Queue.work("default");

// Stop the worker
Queue.stop();

// Check if running
Queue.isRunning(); // boolean
```

The worker polls the queue at `pollInterval` intervals, fetching up to `batchSize` jobs at a time.

## Monitoring

```typescript
// Queue size
await Queue.size("default");

// Fetch failed jobs
await Queue.failed("default", 10);

// Failed queue size
await Queue.failedSize("default");

// Clear all failed jobs
await Queue.flushFailed("default");

// Recover timed-out jobs
await Queue.recoverTimeout("default");
```

## Retry Mechanism

- Failed jobs auto-retry (up to `defaultMaxRetries` times)
- Exponential backoff: 5s → 25s → 125s (max 5 minutes)
- Jobs exceeding max retries move to the failed queue
- Timed-out jobs auto-recover via `recoverTimeout`

## Drivers

### MemoryQueueDriver (default)

```typescript
import { MemoryQueueDriver } from "system/core/queue.ts";
const driver = new MemoryQueueDriver();
```

- In-memory, resets on server restart
- Suitable for development / single-server environments

### RedisQueueDriver

```typescript
import { RedisQueueDriver } from "system/core/queue.ts";
const driver = new RedisQueueDriver({
  redisUrl: "redis://localhost:6379",
});
```

- Multi-worker support in distributed environments
- Sorted Set for availableAt ordering
- Reserved jobs managed via Hash
- Failed jobs managed via List

```env
QUEUE_DRIVER=redis
QUEUE_REDIS_URL=redis://localhost:6379
```
