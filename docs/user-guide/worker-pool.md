# ⚡ Worker Pool

A parallel job processing system built on `Bun.Worker`.

## Basic Usage

```typescript
import { WorkerPool } from "system/core/worker_pool.ts";

// Create worker pool
const pool = new WorkerPool({
  concurrency: 4,               // number of workers (default: CPU cores - 1)
  handlerScript: "./app/jobs/handlers.ts",  // handler script
  jobTimeout: 30000,             // job timeout (ms)
  smol: false,                   // memory saving mode
});

// Event listeners
pool.on("jobCompleted", (jobId, workerId, duration) => {
  console.log(`Job ${jobId} done by worker ${workerId} in ${duration}ms`);
});

// Start worker pool
await pool.start();

// Dispatch a job
pool.dispatch({
  id: "job-1",
  queue: "default",
  type: "SendEmailJob",
  data: { to: "user@test.com" },
  // ... JobPayload fields
});

// Stop
await pool.stop();
```

## Handler Script Mode

Write a handler script to be executed in workers:

```typescript
// app/jobs/handlers.ts
declare var self: Worker;

const handlers: Record<string, (data: any) => Promise<void>> = {
  SendEmailJob: async (data) => {
    // Email sending logic
  },
  ProcessVideoJob: async (data) => {
    // Video processing logic
  },
};

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === "job") {
    const handler = handlers[msg.payload.type];
    if (handler) {
      try {
        await handler(msg.payload.data);
        postMessage({ type: "job_completed", jobId: msg.payload.id, workerId: msg.payload.workerId, duration: 0 });
      } catch (err) {
        postMessage({ type: "job_failed", jobId: msg.payload.id, workerId: msg.payload.workerId, error: err.message, retryable: true });
      }
    }
  }
};

postMessage({ type: "ready", workerId: 0 });
```

## Inline Handler Mode

Without `handlerScript`, an inline worker is created via blob URL:

```typescript
const pool = new WorkerPool({ concurrency: 2 });

// Register handler script paths
pool.registerHandler("./app/jobs/email_handler.ts");
pool.registerHandler("./app/jobs/video_handler.ts");

await pool.start();
```

## Using Bun.Worker Natively

This module leverages Bun's built-in `Worker` API:

- `new Worker(url, { smol })` → create worker
- `worker.postMessage(msg)` → send message (fast path optimized)
- `worker.onmessage` → receive message
- `worker.terminate()` → terminate worker
- `worker.unref()` → detach from process lifetime
- Blob URL → create inline worker

## Status

```typescript
const status = pool.status();
// {
//   started, totalWorkers, activeWorkers, busyWorkers, idleWorkers,
//   pendingJobs, totalCompleted, totalFailed, workers: [...]
// }

const health = await pool.healthCheck();
// { healthy, workers: [{ id, alive }] }
```

## Worker Pool + Queue Integration

```typescript
import { Queue, WorkerPool } from "system/core/queue.ts";

const pool = new WorkerPool({ concurrency: 4 });

Queue.register("SendEmailJob", async (data) => {
  // Handler logic
});

// Use worker pool instead of queue workers
Queue.work("default"); // default worker

// Or dispatch directly with worker pool
const job = await Queue.getDriver().pop("default");
if (job) pool.dispatch(job);
```
