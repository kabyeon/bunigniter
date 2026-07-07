# 📊 프로파일러

성능 분석 도구입니다. 벤치마크, 실행 쿼리, 메모리 사용량을 측정하고 개발 환경에서 HTML 오버레이로 표시합니다. CodeIgniter 3의 Profiler와 동일합니다.

## 활성화

```typescript
import { Profiler } from "system/core/profiler.ts";

// 개발 환경에서만 활성화
if (appConfig.debug) {
  Profiler.enable(true);
}
```

CI3: `$this->output->enable_profiler(TRUE)` 와 동일합니다.

## 벤치마크

### 포인트 측정

```typescript
// 시작/종료 포인트
Profiler.start("db_query");
const result = await db`SELECT * FROM users`;
Profiler.end("db_query");

// 콜백 방식 (자동 start/end)
const users = await Profiler.benchmark("db_query", async () => {
  return await db`SELECT * FROM users`;
});
```

### 벤치마크 데이터

```typescript
const data = Profiler.getData();
for (const bm of data.benchmarks) {
  console.log(`${bm.name}: ${bm.durationMs.toFixed(2)}ms, ${bm.memoryDeltaBytes} bytes`);
}
```

## 쿼리 로깅

QueryBuilder나 Model에서 자동으로 쿼리를 로깅합니다. 수동 로깅도 가능:

```typescript
Profiler.logQuery("SELECT * FROM users WHERE id = ?", [1], 5.2);
```

### 쿼리 데이터

```typescript
const data = Profiler.getData();
for (const q of data.queries) {
  console.log(`${q.sql} — ${q.durationMs.toFixed(2)}ms — bindings: ${JSON.stringify(q.bindings)}`);
}
```

## 메모리 사용량

```typescript
const data = Profiler.getData();
console.log(`현재: ${formatBytes(data.memoryUsage.current)}`);
console.log(`Peak: ${formatBytes(data.memoryUsage.peak)}`);
```

## HTML 오버레이 렌더링

개발 환경에서 페이지 하단에 프로파일러 바를 표시합니다:

```typescript
// 컨트롤러/미들웨어에서
const html = Profiler.render(request);

// 응답 HTML에 추가
return new Response(bodyHtml + html, {
  headers: { "Content-Type": "text/html; charset=utf-8" },
});
```

프로파일러 바에는:

- 📊 벤치마크 포인트 (시간 + 메모리)
- 🗄️ 실행된 쿼리 목록 (SQL + 바인딩 + 시간)
- 🌐 요청 정보
- 메모리 사용량 (current / peak)
- 로드된 파일 수

## 리셋

요청이 끝난 후 데이터를 초기화:

```typescript
Profiler.reset();
```

## 전체 데이터

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

## CI3 ↔ BunIgniter 대조표

| CodeIgniter 3 | BunIgniter |
|---------------|-----------|
| `$this->output->enable_profiler(TRUE)` | `Profiler.enable(true)` |
| `$this->benchmark->mark('start')` | `Profiler.start("start")` |
| `$this->benchmark->mark('end')` | `Profiler.end("end")` |
| `$this->benchmark->elapsed_time('start', 'end')` | `Profiler.getData().benchmarks.find(...)` |
| 자동 쿼리 로깅 | `Profiler.logQuery()` |
| 프로파일러 바 (하단) | `Profiler.render()` |
| `$this->benchmark->memory_usage()` | `Profiler.getData().memoryUsage` |
