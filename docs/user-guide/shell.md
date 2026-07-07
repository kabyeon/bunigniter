# 🐚 Shell Helper

Process execution utilities built on `Bun.spawn()` / `Bun.$`.

## Running Commands

```typescript
import { Shell } from "system/core/shell.ts";

// Async execution
const result = await Shell.run("git status --porcelain");
console.log(result.stdout);
console.log(result.exitCode);
console.log(result.success);

// Sync execution (suited for CLI)
const syncResult = Shell.runSync("echo hello");

// Array command (safe argument passing)
const result = await Shell.exec("git", ["log", "--oneline", "-10"]);

// stdout only
const output = await Shell.output("git rev-parse HEAD");

// Success check only
const ok = await Shell.success("which bun");

// Exit code only
const code = await Shell.quiet("true");
```

## Background Processes

```typescript
// Start a background worker
const proc = Shell.spawn(["bun", "run", "worker.ts"], {
  onExit(proc, exitCode) {
    console.log("Worker exited:", exitCode);
  },
  onMessage(msg, proc) {
    console.log("IPC message:", msg);
  },
});

// Wait for exit
await proc.exited;

// Kill process
proc.kill();
```

## Bun.$ Template Literal

```typescript
const $ = Shell.$;

// Basic execution
await $`echo hello world`;

// Read output
const text = await $`git status`.text();
const lines = await $`ls -la`.lines();

// Environment variables
await $`FOO=bar bun -e 'console.log(process.env.FOO)'`;
```

## Pipeline

```typescript
const result = await Shell.pipe([
  "echo hello world",
  "wc -w",
]);
console.log(result.stdout.trim()); // "2"
```

## Result Structure

```typescript
interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}
```

## Using Bun.spawn / Bun.$ Natively

This module wraps Bun's built-in process execution APIs:

- `Bun.spawn(cmd, options)` → async process
- `Bun.spawnSync(cmd, options)` → sync process
- `Bun.$\`command\`` → template literal shell
