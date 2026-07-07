# 🔌 WebSocket

Supports Bun's built-in WebSocket. Uses the `websocket` option of `Bun.serve` for native Pub/Sub.

## WebSocketManager (Pub/Sub)

```typescript
import { WebSocketManager } from "system/core/websocket.ts";
const ws = new WebSocketManager();

ws.addClient(clientSocket);         // register a client
ws.removeClient(clientSocket);      // remove a client

ws.subscribe("chat", clientSocket); // subscribe to a channel
ws.unsubscribe("chat", clientSocket); // unsubscribe from a channel

ws.publish("chat", { text: "Hello!" }); // broadcast to a channel
ws.broadcast({ announcement: "Notice" }); // broadcast to all

ws.channelCount("chat");  // number of subscribers
ws.clientCount();         // total connections
ws.getChannels();         // list of channels
```

## Bun.serve WebSocket Configuration

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

// Pass as the websocket option to Bun.serve
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

## Client Example

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
