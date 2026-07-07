# 📋 Audit Log

An audit logging system that automatically tracks model events (create/update/delete).

Integration of CI3's logging + DB tracking.

## Configuration

```typescript
import { AuditLog } from "system/core/audit_log.ts";

AuditLog.configure({
  enabled: true,
  trackEvents: ["create", "update", "delete", "login"],
  logToFile: true,
  userIdResolver: () => Auth.user()?.id ?? null,
});
```

## Creating the Table

```bash
bun run bi migrate
```

Or manually:

```typescript
await AuditLog.createTable();
```

## Manual Logging

```typescript
// Create
await AuditLog.logCreate("posts", "42", { title: "Hello" });

// Update
await AuditLog.logUpdate("posts", "42", { title: "Old" }, { title: "New" });

// Delete
await AuditLog.logDelete("posts", "42", { title: "Hello" });

// Login
await AuditLog.logLogin("users", "1", "127.0.0.1");

// Custom event
await AuditLog.logCustom("export", "reports", "daily", "Daily report exported");
```

## Automatic Model Tracking

```typescript
// Automatically track model create/update/delete
AuditLog.track(postModel, ["create", "update", "delete"]);
AuditLog.track(userModel, ["create", "delete"]);
```

## Querying Logs

```typescript
// Logs for a specific entity
const logs = await AuditLog.getLogs("posts", "42");

// Logs by event type
const logins = await AuditLog.getLogsByEvent("login");

// Logs by user
const userLogs = await AuditLog.getLogsByUser(1);
```

## Log Structure

```typescript
interface AuditLogEntry {
  id?: number;
  event: string;           // "create" | "update" | "delete" | "login" | "custom"
  entity_type: string;     // "posts"
  entity_id: string;       // "42"
  old_values: string;      // JSON (on update/delete)
  new_values: string;      // JSON (on create/update)
  user_id: number | null;  // actor ID
  ip_address: string;      // IP address
  description: string;     // description
  created_at?: string;     // creation time
}
```
