# ⏳ 큐 / 잡 시스템

백그라운드 작업 큐 시스템입니다. 메모리 + Redis 드라이버를 지원합니다.

## 설정

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

## 잡 핸들러 등록

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

// 일괄 등록
Queue.registerMany({
  ProcessVideoJob: async (data) => { /* ... */ },
  GenerateReportJob: async (data) => { /* ... */ },
});
```

## 잡 디스패치

```typescript
// 즉시 실행
await Queue.push("SendEmailJob", {
  to: "user@test.com",
  subject: "환영합니다",
  html: "<h1>Hello!</h1>",
});

// 지연 실행 (60초 후)
await Queue.later(60, "SendEmailJob", { to: "user@test.com" });

// 특정 시각에 실행
await Queue.scheduleAt(new Date("2025-12-25T09:00:00"), "SendReportJob", {});

// 특정 큐에 푸시
await Queue.push("ProcessVideoJob", { videoId: 123 }, "videos");
```

## 워커 실행

```typescript
// 기본 큐 워커 시작
Queue.work("default");

// 워커 정지
Queue.stop();

// 실행 중 확인
Queue.isRunning(); // boolean
```

워커는 `pollInterval` 간격으로 큐를 폴링하여 `batchSize`만큼 잡을 꺼내 처리합니다.

## 모니터링

```typescript
// 큐 크기
await Queue.size("default");

// 실패 잡 조회
await Queue.failed("default", 10);

// 실패 큐 크기
await Queue.failedSize("default");

// 실패 잡 전체 삭제
await Queue.flushFailed("default");

// 타임아웃 잡 복구
await Queue.recoverTimeout("default");
```

## 재시도 메커니즘

- 잡 실패 시 자동 재시도 (최대 `defaultMaxRetries`회)
- 지수 백오프: 5초 → 25초 → 125초 (최대 5분)
- 최대 재시도 초과 시 실패 큐로 이동
- 타임아웃 잡 자동 복구 (`recoverTimeout`)

## 드라이버

### MemoryQueueDriver (기본)

```typescript
import { MemoryQueueDriver } from "system/core/queue.ts";
const driver = new MemoryQueueDriver();
```

- 인메모리, 서버 재시작 시 초기화
- 개발/단일 서버 환경에 적합

### RedisQueueDriver

```typescript
import { RedisQueueDriver } from "system/core/queue.ts";
const driver = new RedisQueueDriver({
  redisUrl: "redis://localhost:6379",
});
```

- 분산 환경에서 다중 워커 가능
- Sorted Set으로 availableAt 기준 정렬
- 예약 잡은 Hash로 관리
- 실패 잡은 List로 관리

```env
QUEUE_DRIVER=redis
QUEUE_REDIS_URL=redis://localhost:6379
```
