# 📊 Queue Dashboard

Queue monitoring dashboard with JSON API endpoints.

## HTML Dashboard

Visit `/_dashboard` in your browser:

- Pending/failed job counts
- Scheduled job status
- Registered handler list
- Runtime info (memory, uptime)
- Worker start/stop buttons
- 10-second auto-refresh

## Setup

```typescript
// bootstrap.ts or routes.ts
import { createDashboardRoutes } from "system/core/dashboard.ts";

const routes = createDashboardRoutes(["default", "emails"]);
// Register routes with Bun.serve
```

## JSON API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/_dashboard/api` | Dashboard data (JSON) |
| POST | `/_dashboard/api/worker/start` | Start worker |
| POST | `/_dashboard/api/worker/stop` | Stop worker |
| POST | `/_dashboard/api/queue/:name/flush-failed` | Clear failed jobs |
| POST | `/_dashboard/api/queue/:name/recover-timeout` | Recover timed-out jobs |
| GET | `/_dashboard/api/scheduler` | Scheduled jobs list |
| POST | `/_dashboard/api/scheduler/:name/toggle` | Enable/disable a job |

## Data Structure

```typescript
interface DashboardData {
  queues: Array<{ name: string; size: number; failedSize: number }>;
  scheduledJobs: Array<{
    name: string; schedule: string; enabled: boolean;
    lastRunAt: number | null; lastError: string | null;
    runCount: number; errorCount: number; nextRun: string | null;
  }>;
  registeredHandlers: string[];
  workerRunning: boolean;
  schedulerStarted: boolean;
  serverTime: string;
  runtime: { bun: string; platform: string; arch: string; uptime: number; memoryUsage: MemoryUsage };
}
```
