# 🐚 셸 헬퍼

`Bun.spawn()` / `Bun.$` 내장 기능을 활용한 프로세스 실행 유틸리티입니다.

## 명령어 실행

```typescript
import { Shell } from "system/core/shell.ts";

// 비동기 실행
const result = await Shell.run("git status --porcelain");
console.log(result.stdout);
console.log(result.exitCode);
console.log(result.success);

// 동기 실행 (CLI에 적합)
const syncResult = Shell.runSync("echo hello");

// 배열 명령어 (안전한 인자 전달)
const result = await Shell.exec("git", ["log", "--oneline", "-10"]);

// 표준 출력만
const output = await Shell.output("git rev-parse HEAD");

// 성공 여부만
const ok = await Shell.success("which bun");

// 종료 코드만
const code = await Shell.quiet("true");
```

## 백그라운드 프로세스

```typescript
// 백그라운드 워커 시작
const proc = Shell.spawn(["bun", "run", "worker.ts"], {
  onExit(proc, exitCode) {
    console.log("Worker exited:", exitCode);
  },
  onMessage(msg, proc) {
    console.log("IPC message:", msg);
  },
});

// 종료 대기
await proc.exited;

// 프로세스 종료
proc.kill();
```

## Bun.$ 템플릿 리터럴

```typescript
const $ = Shell.$;

// 기본 실행
await $`echo hello world`;

// 출력 읽기
const text = await $`git status`.text();
const lines = await $`ls -la`.lines();

// 환경 변수
await $`FOO=bar bun -e 'console.log(process.env.FOO)'`;
```

## 파이프라인

```typescript
const result = await Shell.pipe([
  "echo hello world",
  "wc -w",
]);
console.log(result.stdout.trim()); // "2"
```

## 결과 구조

```typescript
interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}
```

## Bun.spawn / Bun.$ 내장 사용

이 모듈은 Bun의 내장 프로세스 실행 API를 래핑합니다:

- `Bun.spawn(cmd, options)` → 비동기 프로세스
- `Bun.spawnSync(cmd, options)` → 동기 프로세스
- `Bun.$\`command\`` → 템플릿 리터럴 셸
