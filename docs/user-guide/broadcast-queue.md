# 📡 Redis Pub/Sub Broadcast Queue

Broadcasts queue events across multiple processes/servers.

Uses Bun's built-in `RedisClient.subscribe/publish`.

## Setup

```typescript
import { BroadcastQueue } from "system/core/broadcast_queue.ts";

const bq = new BroadcastQueue({
  redisUrl: "redis://localhost:6379",
  channelPrefix: "bunigniter:broadcast:",
  queues: ["default", "emails"],
});

await bq.connect();
```

## Broadcasting Jobs

```typescript
// Notify all workers of a new job
await bq.broadcastJob("default", {
  type: "SendEmailJob",
  data: { to: "user@test.com", subject: "Hello" },
});
```

## Broadcasting Commands

```typescript
// Stop command to all workers
await bq.broadcastCommand("worker:stop", { queue: "default" });

// Start command to all workers
await bq.broadcastCommand("worker:start", { queue: "emails" });

// Flush failed jobs
await bq.broadcastCommand("flush:failed", { queue: "default" });
```

## Broadcasting Events

```typescript
// Job completed/failed events
await bq.broadcastEvent("job.completed", {
  jobId: "abc-123",
  type: "SendEmailJob",
  duration: 1500,
});
```

## Receiving Events

```typescript
// Receive all events
bq.onEvent((msg) => {
  console.log(msg.type, msg.payload);
});

// Receive specific types only
bq.on("job", (msg) => {
  console.log("New job:", msg.payload);
});

bq.on("command", (msg) => {
  console.log("Command:", msg.payload.command);
});
```

## Message Structure

```typescript
interface BroadcastMessage {
  type: "job" | "command" | "event";
  payload: any;
  senderId: string;      // sender identifier
  timestamp: number;     // millisecond timestamp
}
```

## Bun Built-in Redis Pub/Sub

This module uses Bun's built-in `RedisClient.subscribe/publish` APIs:

- `client.subscribe(channel, callback)` → subscribe to a channel
- `client.publish(channel, message)` → publish a message to a channel
- `client.unsubscribe(channel)` → unsubscribe from a channel
