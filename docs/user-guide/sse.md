# 📡 Server-Sent Events (SSE)

Real-time event broadcasting using Bun.serve's `ReadableStream`.

## Basic Usage

```typescript
import { SSEManager } from "system/core/sse.ts";

const sse = new SSEManager();

// Connect via Bun.serve route
Bun.serve({
  routes: {
    "/events": (req) => sse.handleConnection(req, { userId: "1" }),
  },
});

// Broadcast events
sse.broadcast({ event: "update", data: JSON.stringify({ count: 1 }) });
sse.broadcastJSON("notification", { message: "Hello!" });

// Channel subscription
sse.subscribe(clientId, "orders");
sse.publish("orders", { event: "new", data: JSON.stringify(order) });
```

## Configuration

```typescript
const sse = new SSEManager({
  heartbeatInterval: 30000,  // heartbeat (ms), default 30000
  maxClients: 1000,          // max clients, default 1000
  allowedOrigin: "*",        // CORS origin
  connectionTimeout: 0,      // connection timeout (0=unlimited)
  historySize: 100,          // event history size
});
```

## Bun.serve Integration

```typescript
import { createSSERoutes } from "system/core/sse.ts";

const routes = createSSERoutes({ basePath: "/_sse" });
// GET  /_sse              - SSE connection
// POST /_sse/subscribe    - Subscribe to channel
// POST /_sse/unsubscribe  - Unsubscribe from channel
// POST /_sse/publish      - Publish event
// GET  /_sse/api/status   - Status
// GET  /_sse/api/clients  - Client list
// GET  /_sse/api/channels - Channel list
// GET  /_sse/api/history  - Event history
```

## Client (JavaScript)

```javascript
const source = new EventSource("/_sse");

source.addEventListener("connected", (e) => {
  const { clientId } = JSON.parse(e.data);
  // Subscribe to channel
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

| Method | Description |
|--------|-------------|
| `handleConnection(request?, metadata?)` | Create SSE connection Response |
| `broadcast(event)` | Broadcast to all clients |
| `publish(channel, event)` | Publish to a channel |
| `send(clientId, event)` | Send to a specific client |
| `broadcastJSON(event, data)` | Broadcast JSON |
| `publishJSON(channel, event, data)` | Send JSON to channel |
| `subscribe(clientId, channel)` | Subscribe to channel |
| `unsubscribe(clientId, channel)` | Unsubscribe from channel |
| `getHistory(afterId?)` | Event history |
| `status()` | Manager status |
| `getClients()` | Client list |
| `getChannels()` | Channel list |
| `close()` | Shutdown all |
