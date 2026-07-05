# 📊 큐 대시보드

큐 모니터링 대시보드 + JSON API 엔드포인트입니다.

## HTML 대시보드

브라우저에서 `/_dashboard` 접속:

- 대기/실패 잡 수
- 스케줄드 잡 현황
- 등록된 핸들러 목록
- 런타임 정보 (메모리, 업타임)
- 워커 시작/정지 버튼
- 10초 자동 새로고침

## 설정

```typescript
// bootstrap.ts 또는 routes.ts
import { createDashboardRoutes } from "system/core/dashboard.ts";

const routes = createDashboardRoutes(["default", "emails"]);
// routes를 Elysia 앱에 등록
```

## JSON API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/_dashboard/api` | 대시보드 데이터 (JSON) |
| POST | `/_dashboard/api/worker/start` | 워커 시작 |
| POST | `/_dashboard/api/worker/stop` | 워커 정지 |
| POST | `/_dashboard/api/queue/:name/flush-failed` | 실패 잡 삭제 |
| POST | `/_dashboard/api/queue/:name/recover-timeout` | 타임아웃 잡 복구 |
| GET | `/_dashboard/api/scheduler` | 스케줄드 잡 목록 |
| POST | `/_dashboard/api/scheduler/:name/toggle` | 잡 활성화/비활성화 |

## 데이터 구조

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
