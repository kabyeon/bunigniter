# 📡 Redis Pub/Sub 브로드캐스트 큐

다중 프로세스/서버 환경에서 큐 이벤트를 브로드캐스트합니다.

`Bun` 내장 `RedisClient.subscribe/publish`를 사용합니다.

## 설정

```typescript
import { BroadcastQueue } from "system/core/broadcast_queue.ts";

const bq = new BroadcastQueue({
  redisUrl: "redis://localhost:6379",
  channelPrefix: "bunigniter:broadcast:",
  queues: ["default", "emails"],
});

await bq.connect();
```

## 잡 브로드캐스트

```typescript
// 모든 워커에 새 잡 알림
await bq.broadcastJob("default", {
  type: "SendEmailJob",
  data: { to: "user@test.com", subject: "Hello" },
});
```

## 명령 브로드캐스트

```typescript
// 모든 워커에 정지 명령
await bq.broadcastCommand("worker:stop", { queue: "default" });

// 모든 워커에 시작 명령
await bq.broadcastCommand("worker:start", { queue: "emails" });

// 실패 잡 삭제
await bq.broadcastCommand("flush:failed", { queue: "default" });
```

## 이벤트 브로드캐스트

```typescript
// 잡 완료/실패 이벤트
await bq.broadcastEvent("job.completed", {
  jobId: "abc-123",
  type: "SendEmailJob",
  duration: 1500,
});
```

## 이벤트 수신

```typescript
// 모든 이벤트 수신
bq.onEvent((msg) => {
  console.log(msg.type, msg.payload);
});

// 특정 타입만 수신
bq.on("job", (msg) => {
  console.log("New job:", msg.payload);
});

bq.on("command", (msg) => {
  console.log("Command:", msg.payload.command);
});
```

## 메시지 구조

```typescript
interface BroadcastMessage {
  type: "job" | "command" | "event";
  payload: any;
  senderId: string;      // 발신자 식별자
  timestamp: number;     // 밀리초 타임스탬프
}
```

## Bun 내장 Redis Pub/Sub

이 모듈은 Bun의 `RedisClient.subscribe/publish` 내장 API를 사용합니다:

- `client.subscribe(channel, callback)` → 채널 구독
- `client.publish(channel, message)` → 채널에 메시지 발행
- `client.unsubscribe(channel)` → 구독 해지
