# 🔌 WebSocket

Bun 내장 WebSocket을 지원합니다. `Bun.serve`의 `websocket` 옵션으로 네이티브 Pub/Sub을 사용합니다.

## WebSocketManager (Pub/Sub)

```typescript
import { WebSocketManager } from "system/core/websocket.ts";
const ws = new WebSocketManager();

ws.addClient(clientSocket);         // 클라이언트 등록
ws.removeClient(clientSocket);      // 클라이언트 제거

ws.subscribe("chat", clientSocket); // 채널 구독
ws.unsubscribe("chat", clientSocket); // 채널 해제

ws.publish("chat", { text: "Hello!" }); // 채널 브로드캐스트
ws.broadcast({ announcement: "공지" }); // 전체 브로드캐스트

ws.channelCount("chat");  // 구독자 수
ws.clientCount();         // 전체 연결 수
ws.getChannels();         // 채널 목록
```

## Bun.serve WebSocket 설정

```typescript
import { createWebSocketConfig, wsManager } from "system/core/websocket.ts";

const wsConfig = createWebSocketConfig({
  path: "/ws",
  open(ws) {
    wsManager.addClient(ws);
  },
  message(ws, message) {
    const data = JSON.parse(message);
    if (data.channel) wsManager.subscribe(data.channel, ws);
    wsManager.publish(data.channel, data);
  },
  close(ws) {
    wsManager.removeClient(ws);
  },
});

// Bun.serve에 websocket 옵션으로 전달
const server = Bun.serve({
  fetch(req, server) {
    if (req.headers.get("upgrade") === "websocket") {
      return server.upgrade(req);
    }
    return new Response("Not found", { status: 404 });
  },
  websocket: wsConfig,
});
```

## 클라이언트 예시

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({ channel: "chat", action: "subscribe" }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

ws.send(JSON.stringify({ channel: "chat", text: "Hello!" }));
```
