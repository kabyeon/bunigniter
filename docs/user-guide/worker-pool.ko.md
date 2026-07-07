# ⚡ 워커 풀

`Bun.Worker` 기반 병렬 잡 처리 시스템입니다。

## 기본 사용법

```typescript
import { WorkerPool } from "system/core/worker_pool.ts";

// 워커 풀 생성
const pool = new WorkerPool({
  concurrency: 4,               // 워커 수 (기본: CPU 코어 - 1)
  handlerScript: "./app/jobs/handlers.ts",  // 핸들러 스크립트
  jobTimeout: 30000,             // 잡 타임아웃 (ms)
  smol: false,                   // 메모리 절약 모드
});

// 이벤트 리스너
pool.on("jobCompleted", (jobId, workerId, duration) => {
  console.log(`Job ${jobId} done by worker ${workerId} in ${duration}ms`);
});

// 워커 풀 시작
await pool.start();

// 잡 디스패치
pool.dispatch({
  id: "job-1",
  queue: "default",
  type: "SendEmailJob",
  data: { to: "user@test.com" },
  // ... JobPayload 필드
});

// 정지
await pool.stop();
```

## 핸들러 스크립트 모드

워커에서 실행할 핸들러 스크립트를 작성합니다:

```typescript
// app/jobs/handlers.ts
declare var self: Worker;

const handlers: Record<string, (data: any) => Promise<void>> = {
  SendEmailJob: async (data) => {
    // 이메일 발송 로직
  },
  ProcessVideoJob: async (data) => {
    // 비디오 처리 로직
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

## 인라인 핸들러 모드

`handlerScript` 없이 생성하면 blob URL로 인라인 워커가 생성됩니다:

```typescript
const pool = new WorkerPool({ concurrency: 2 });

// 핸들러 스크립트 경로 등록
pool.registerHandler("./app/jobs/email_handler.ts");
pool.registerHandler("./app/jobs/video_handler.ts");

await pool.start();
```

## Bun.Worker 내장 사용

이 모듈은 Bun의 `Worker` 내장 API를 활용합니다:

- `new Worker(url, { smol })` → 워커 생성
- `worker.postMessage(msg)` → 메시지 전송 (빠른 경로 최적화)
- `worker.onmessage` → 메시지 수신
- `worker.terminate()` → 워커 종료
- `worker.unref()` → 프로세스 생존 분리
- Blob URL → 인라인 워커 생성

## 상태 조회

```typescript
const status = pool.status();
// {
//   started, totalWorkers, activeWorkers, busyWorkers, idleWorkers,
//   pendingJobs, totalCompleted, totalFailed, workers: [...]
// }

const health = await pool.healthCheck();
// { healthy, workers: [{ id, alive }] }
```

## 워커 풀 + 큐 연동

```typescript
import { Queue, WorkerPool } from "system/core/queue.ts";

const pool = new WorkerPool({ concurrency: 4 });

Queue.register("SendEmailJob", async (data) => {
  // 핸들러 로직
});

// 큐 워커 대신 워커 풀 사용
Queue.work("default"); // 기본 워커

// 또는 워커 풀로 직접 디스패치
const job = await Queue.getDriver().pop("default");
if (job) pool.dispatch(job);
```
