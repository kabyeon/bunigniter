# 📊 Profiler

A performance analysis tool. Measures benchmarks, executed queries, and memory usage, displaying them as an HTML overlay in development environments. Equivalent to CodeIgniter 3's Profiler.

## Enabling

```typescript
import { Profiler } from "system/core/profiler.ts";

// Enable only in development
if (appConfig.debug) {
  Profiler.enable(true);
}
```

Equivalent to CI3's `$this->output->enable_profiler(TRUE)`.

## Benchmarking

### Point Measurement

```typescript
// Start/end points
Profiler.start("db_query");
const result = await db`SELECT * FROM users`;
Profiler.end("db_query");

// Callback style (auto start/end)
const users = await Profiler.benchmark("db_query", async () => {
  return await db`SELECT * FROM users`;
});
```

### Benchmark Data

```typescript
const data = Profiler.getData();
for (const bm of data.benchmarks) {
  console.log(`${bm.name}: ${bm.durationMs.toFixed(2)}ms, ${bm.memoryDeltaBytes} bytes`);
}
```

## Query Logging

QueryBuilder and Model automatically log queries. Manual logging is also available:

```typescript
Profiler.logQuery("SELECT * FROM users WHERE id = ?", [1], 5.2);
```

### Query Data

```typescript
const data = Profiler.getData();
for (const q of data.queries) {
  console.log(`${q.sql} — ${q.durationMs.toFixed(2)}ms — bindings: ${JSON.stringify(q.bindings)}`);
}
```

## Memory Usage

```typescript
const data = Profiler.getData();
console.log(`Current: ${formatBytes(data.memoryUsage.current)}`);
console.log(`Peak: ${formatBytes(data.memoryUsage.peak)}`);
```

## HTML Overlay Rendering

Displays a profiler bar at the bottom of the page in development:

```typescript
// In controller/middleware
const html = Profiler.render(request);

// Append to response HTML
return new Response(bodyHtml + html, {
  headers: { "Content-Type": "text/html; charset=utf-8" },
});
```

The profiler bar includes:

- 📊 Benchmark points (time + memory)
- 🗄️ Executed query list (SQL + bindings + time)
- 🌐 Request information
- Memory usage (current / peak)
- Number of loaded files

## Reset

Clear data after a request completes:

```typescript
Profiler.reset();
```

## Full Data

```typescript
interface ProfilerData {
  benchmarks: Array<{ name: string; durationMs: number; memoryDeltaBytes: number }>;
  queries: Array<{ sql: string; bindings: any[]; durationMs: number; timestamp: number }>;
  memoryUsage: { current: number; peak: number };
  request: { method: string; url: string; headers: Record<string, string>; query: Record<string, string>; body: any };
  response: { status: number; durationMs: number };
  loadedFiles: number;
}
```

## CI3 ↔ BunIgniter Comparison

| CodeIgniter 3 | BunIgniter |
|---------------|------------|
| `$this->output->enable_profiler(TRUE)` | `Profiler.enable(true)` |
| `$this->benchmark->mark('start')` | `Profiler.start("start")` |
| `$this->benchmark->mark('end')` | `Profiler.end("end")` |
| `$this->benchmark->elapsed_time('start', 'end')` | `Profiler.getData().benchmarks.find(...)` |
| Automatic query logging | `Profiler.logQuery()` |
| Profiler bar (footer) | `Profiler.render()` |
| `$this->benchmark->memory_usage()` | `Profiler.getData().memoryUsage` |
