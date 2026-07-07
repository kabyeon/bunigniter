# ⏰ Scheduled Jobs (Cron)

A scheduled job system wrapping Bun's built-in `Bun.cron()`.

## Basic Usage

```typescript
import { Scheduler } from "system/core/scheduler.ts";

// Add a job
Scheduler.add("cleanup-temp", "0 * * * *", async () => {
  await cleanupTempFiles();
});

Scheduler.add("daily-report", "@daily", async () => {
  await generateDailyReport();
});

// Start the scheduler
Scheduler.startAll();
```

## Cron Expressions

Standard 5-field format: `minute hour day month weekday`

| Expression | Description |
|------------|-------------|
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour on the hour |
| `0 9 * * MON-FRI` | Weekdays at 9 AM |
| `30 2 * * MON` | Every Monday at 2:30 AM |
| `0 0 1 * *` | First day of every month at midnight |

### Named Aliases

| Alias | Equivalent |
|-------|------------|
| `@yearly` | `0 0 1 1 *` |
| `@monthly` | `0 0 1 * *` |
| `@weekly` | `0 0 * * 0` |
| `@daily` | `0 0 * * *` |
| `@hourly` | `0 * * * *` |

## In-Process vs OS-Level

| | In-Process | OS-Level |
|---|------------|----------|
| Persists after process restart | ❌ | ✅ |
| Shared state | ✅ | ❌ |
| Platform requirement | none | crontab/launchd/Task Scheduler |
| API | `Scheduler.add()` | `Scheduler.registerOs()` |

## OS-Level Cron

```typescript
// Register an OS cron that persists after process restart
await Scheduler.registerOs({
  scriptPath: "./jobs/report.ts",
  schedule: "30 2 * * MON",
  title: "weekly-report",
});

// Remove
await Scheduler.removeOs("weekly-report");
```

OS cron scripts must export a `scheduled()` handler:

```typescript
// jobs/report.ts
export default {
  scheduled(controller) {
    console.log(controller.cron);
    console.log(controller.scheduledTime);
  },
};
```

## Job Management

```typescript
// Disable
Scheduler.disable("daily-report");

// Enable
Scheduler.enable("daily-report");

// Remove
Scheduler.remove("daily-report");

// Stop all jobs
Scheduler.stopAll();
```

## Next Run Time

```typescript
// Next run time
const next = Scheduler.nextRun("@hourly");

// Next 5 run times
const runs = Scheduler.upcomingRuns("@daily", 5);
```

## Job List

```typescript
const jobs = Scheduler.list();
// [{ name, schedule, enabled, lastRunAt, lastError, runCount, errorCount, nextRun }]
```

## Using Bun.cron Built-in

This module wraps Bun's built-in `Bun.cron()`, `Bun.cron.parse()`, and `Bun.cron.remove()` APIs:

- `Bun.cron(schedule, handler)` → in-process scheduling
- `Bun.cron(path, schedule, title)` → OS-level cron registration
- `Bun.cron.parse(expression, relativeDate?)` → next run time
- `Bun.cron.remove(title)` → remove OS cron
