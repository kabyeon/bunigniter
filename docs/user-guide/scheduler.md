# ⏰ 스케줄드 잡 (Cron)

`Bun.cron()` 내장 기능을 래핑한 스케줄드 잡 시스템입니다.

## 기본 사용법

```typescript
import { Scheduler } from "system/core/scheduler.ts";

// 잡 추가
Scheduler.add("cleanup-temp", "0 * * * *", async () => {
  await cleanupTempFiles();
});

Scheduler.add("daily-report", "@daily", async () => {
  await generateDailyReport();
});

// 스케줄러 시작
Scheduler.startAll();
```

## 크론 표현식

5-field 표준: `분 시 일 월 요일`

| 표현식 | 설명 |
|--------|------|
| `*/5 * * * *` | 5분마다 |
| `0 * * * *` | 매 정각 |
| `0 9 * * MON-FRI` | 평일 9시 |
| `30 2 * * MON` | 매주 월요일 2:30 |
| `0 0 1 * *` | 매월 1일 자정 |

### 닉네임

| 닉네임 | 동일 |
|--------|------|
| `@yearly` | `0 0 1 1 *` |
| `@monthly` | `0 0 1 * *` |
| `@weekly` | `0 0 * * 0` |
| `@daily` | `0 0 * * *` |
| `@hourly` | `0 * * * *` |

## 인프로세스 vs OS-레벨

| | 인프로세스 | OS-레벨 |
|---|----------|---------|
| 프로세스 재시작 후 유지 | ❌ | ✅ |
| 상태 공유 | ✅ | ❌ |
| 플랫폼 요구사항 | 없음 | crontab/launchd/Task Scheduler |
| API | `Scheduler.add()` | `Scheduler.registerOs()` |

## OS-레벨 크론

```typescript
// 프로세스 재시작 후에도 유지되는 OS 크론 등록
await Scheduler.registerOs({
  scriptPath: "./jobs/report.ts",
  schedule: "30 2 * * MON",
  title: "weekly-report",
});

// 제거
await Scheduler.removeOs("weekly-report");
```

OS 크론 스크립트는 `scheduled()` 핸들러를 export해야 합니다:

```typescript
// jobs/report.ts
export default {
  scheduled(controller) {
    console.log(controller.cron);
    console.log(controller.scheduledTime);
  },
};
```

## 잡 관리

```typescript
// 비활성화
Scheduler.disable("daily-report");

// 활성화
Scheduler.enable("daily-report");

// 제거
Scheduler.remove("daily-report");

// 모든 잡 정지
Scheduler.stopAll();
```

## 다음 실행 시각

```typescript
// 다음 실행 시각
const next = Scheduler.nextRun("@hourly");

// 다음 5번의 실행 시각
const runs = Scheduler.upcomingRuns("@daily", 5);
```

## 잡 목록

```typescript
const jobs = Scheduler.list();
// [{ name, schedule, enabled, lastRunAt, lastError, runCount, errorCount, nextRun }]
```

## Bun.cron 내장 사용

이 모듈은 Bun의 `Bun.cron()`, `Bun.cron.parse()`, `Bun.cron.remove()` 내장 API를 래핑합니다:

- `Bun.cron(schedule, handler)` → 인프로세스 스케줄링
- `Bun.cron(path, schedule, title)` → OS-레벨 크론 등록
- `Bun.cron.parse(expression, relativeDate?)` → 다음 실행 시각
- `Bun.cron.remove(title)` → OS 크론 제거
