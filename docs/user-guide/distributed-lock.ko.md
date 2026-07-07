# 🔒 분산 잠금

Redis 기반 분산 잠금으로 다중 서버/프로세스 환경에서 동시 실행을 방지합니다。

Bun 내장 `RedisClient` 활용.

## 설정

```typescript
import { DistributedLock } from "system/core/distributed_lock.ts";

// 메모리 드라이버 (개발/테스트)
DistributedLock.configure({ driver: "memory" });

// Redis 드라이버 (운영)
DistributedLock.configure({
  driver: "redis",
  redisUrl: "redis://localhost:6379",
});
```

환경변수:

- `LOCK_DRIVER` — "memory" | "redis" (기본 "memory")
- `REDIS_URL` — Redis 연결 URL
- `LOCK_DEFAULT_TTL` — 기본 잠금 TTL ms (기본 60000)
- `LOCK_RETRY_INTERVAL` — 재시도 간격 ms (기본 200)
- `LOCK_MAX_RETRIES` — 최대 재시도 (기본 50)

## 기본 사용법

```typescript
// 잠금 획득
const lock = await DistributedLock.acquire("my-resource");
if (lock.acquired) {
  try {
    await doWork();
  } finally {
    await DistributedLock.release(lock);
  }
}

// 래퍼 패턴 (권장)
await DistributedLock.run("my-resource", async () => {
  await doWork();
});
// 잠금은 자동으로 해제됨

// 재시도와 함께 잠금 획득
const lock = await DistributedLock.acquireWithRetry("my-resource", 30000, {
  retryInterval: 500,
  maxRetries: 20,
});
```

## 스케줄드 잡 분산 잠금

```typescript
import { Scheduler } from "system/core/scheduler.ts";

// 분산 잠금 활성화
Scheduler.enableDistributedLock("redis");

Scheduler.add("cleanup", "0 * * * *", async () => {
  // 여러 서버 중 하나만 실행
  await cleanupTempFiles();
});
```

또는 수동으로:

```typescript
Scheduler.add("cleanup", "0 * * * *", async () => {
  return DistributedLock.runScheduled("cleanup", async () => {
    await cleanupTempFiles();
  });
});
```

## 잠금 연장 (장시간 실행)

```typescript
await DistributedLock.run("long-task", async () => {
  // autoRenew가 활성화되면 TTL의 1/3 간격으로 자동 연장
  await longRunningTask();
}, { autoRenew: true, ttlMs: 300000 });
```

## 드라이버

### MemoryLockDriver (개발/테스트)

- 단일 프로세스에서만 동작
- 별도 의존성 없음

### RedisLockDriver (운영)

- 다중 서버/프로세스 지원
- `SET NX EX` 원자적 잠금 획득
- Lua 스크립트로 원자적 잠금 해제/연장
- Bun 내장 `RedisClient.send("EVAL", ...)` 사용

## API

| 메서드 | 설명 |
|--------|------|
| `acquire(key, ttl?)` | 잠금 획득 |
| `release(lock)` | 잠금 해제 |
| `renew(lock, ttl?)` | 잠금 연장 |
| `isLocked(key)` | 잠금 상태 조회 |
| `getTtl(key)` | 잠금 TTL 조회 |
| `acquireWithRetry(key, ttl?, options?)` | 재시도와 함께 잠금 획득 |
| `run(key, callback, options?)` | 래퍼 패턴 (자동 획득/해제) |
| `runScheduled(jobName, callback, options?)` | 크론 잡용 래퍼 |
| `releaseAll(prefix?)` | 모든 잠금 해제 |
