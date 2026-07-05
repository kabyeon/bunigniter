# 📡 Server-Sent Events (SSE)

Bun.serve의 `ReadableStream`으로 실시간 이벤트 브로드캐스트.

## 기본 사용법

```typescript
import { SSEManager } from "system/core/sse.ts";

const sse = new SSEManager();

// Bun.serve 라우트에서 연결
Bun.serve({
  routes: {
    "/events": (req) => sse.handleConnection(req, { userId: "1" }),
  },
});

// 이벤트 브로드캐스트
sse.broadcast({ event: "update", data: JSON.stringify({ count: 1 }) });
sse.broadcastJSON("notification", { message: "Hello!" });

// 채널 구독
sse.subscribe(clientId, "orders");
sse.publish("orders", { event: "new", data: JSON.stringify(order) });
```

## 설정

```typescript
const sse = new SSEManager({
  heartbeatInterval: 30000,  // 하트비트 (ms), 기본 30000
  maxClients: 1000,          // 최대 클라이언트, 기본 1000
  allowedOrigin: "*",        // CORS 오리진
  connectionTimeout: 0,      // 연결 타임아웃 (0=무제한)
  historySize: 100,          // 이벤트 히스토리 크기
});
```

## Bun.serve 통합

```typescript
import { createSSERoutes } from "system/core/sse.ts";

const routes = createSSERoutes({ basePath: "/_sse" });
// GET  /_sse              - SSE 연결
// POST /_sse/subscribe    - 채널 구독
// POST /_sse/unsubscribe  - 채널 구독 해제
// POST /_sse/publish      - 이벤트 발행
// GET  /_sse/api/status   - 상태 조회
// GET  /_sse/api/clients  - 클라이언트 목록
// GET  /_sse/api/channels - 채널 목록
// GET  /_sse/api/history  - 이벤트 히스토리
```

## 클라이언트 (JavaScript)

```javascript
const source = new EventSource("/_sse");

source.addEventListener("connected", (e) => {
  const { clientId } = JSON.parse(e.data);
  // 채널 구독
  fetch("/_sse/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, channel: "notifications" }),
  });
});

source.addEventListener("notification", (e) => {
  console.log("Notification:", JSON.parse(e.data));
});
```

## API

| 메서드 | 설명 |
|--------|------|
| `handleConnection(request?, metadata?)` | SSE 연결 Response 생성 |
| `broadcast(event)` | 모든 클라이언트에 이벤트 |
| `publish(channel, event)` | 채널에 이벤트 |
| `send(clientId, event)` | 특정 클라이언트에 이벤트 |
| `broadcastJSON(event, data)` | JSON 브로드캐스트 |
| `publishJSON(channel, event, data)` | 채널에 JSON 전송 |
| `subscribe(clientId, channel)` | 채널 구독 |
| `unsubscribe(clientId, channel)` | 채널 구독 해제 |
| `getHistory(afterId?)` | 이벤트 히스토리 |
| `status()` | 매니저 상태 |
| `getClients()` | 클라이언트 목록 |
| `getChannels()` | 채널 목록 |
| `close()` | 전체 종료 |
