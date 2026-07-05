// ============================================================
// BunIgniter - Queue Dashboard
// 큐 모니터링 대시보드 + API 엔드포인트
// HTML UI + JSON API
// ============================================================

import { Queue } from "./queue.ts";
import { Scheduler } from "./scheduler.ts";

// ─── 대시보드 데이터 인터페이스 ──────────────────────────

export interface DashboardData {
	/** 큐 현황 */
	queues: Array<{
		name: string;
		size: number;
		failedSize: number;
	}>;
	/** 스케줄드 잡 현황 */
	scheduledJobs: Array<{
		name: string;
		schedule: string;
		enabled: boolean;
		lastRunAt: number | null;
		lastError: string | null;
		runCount: number;
		errorCount: number;
		nextRun: string | null;
	}>;
	/** 등록된 잡 핸들러 */
	registeredHandlers: string[];
	/** 워커 상태 */
	workerRunning: boolean;
	/** 스케줄러 상태 */
	schedulerStarted: boolean;
	/** 서버 시각 */
	serverTime: string;
	/** 런타임 정보 */
	runtime: {
		bun: string;
		platform: string;
		arch: string;
		uptime: number;
		memoryUsage: NodeJS.MemoryUsage;
	};
}

// ─── 대시보드 HTML 생성 ──────────────────────────────────

/**
 * 대시보드 HTML 생성
 */
export function dashboardHtml(data: DashboardData): string {
	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BunIgniter Queue Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
  h1 { color: #e94560; margin-bottom: 8px; font-size: 1.5rem; }
  h2 { color: #0f3460; background: #16213e; padding: 10px 14px; border-radius: 6px; margin: 20px 0 10px; font-size: 1.1rem; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 12px; }
  .header .meta { color: #888; font-size: 0.85rem; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
  .status-running { background: #0f9d58; color: #fff; }
  .status-stopped { background: #db4437; color: #fff; }
  .card { background: #16213e; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
  .stat-card { text-align: center; }
  .stat-card .value { font-size: 2rem; font-weight: 700; color: #e94560; }
  .stat-card .label { font-size: 0.85rem; color: #888; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #2a2a4a; font-size: 0.9rem; }
  th { color: #e94560; font-weight: 600; }
  tr:hover { background: #1a1a3e; }
  .error-text { color: #db4437; font-size: 0.8rem; }
  .success-text { color: #0f9d58; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; background: #0f3460; color: #aaa; margin: 2px; }
  .actions { margin: 16px 0; display: flex; gap: 8px; }
  .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: background 0.2s; }
  .btn-danger { background: #db4437; color: #fff; }
  .btn-danger:hover { background: #c33d2e; }
  .btn-primary { background: #0f3460; color: #fff; }
  .btn-primary:hover { background: #1a4a8a; }
  .btn-success { background: #0f9d58; color: #fff; }
  .btn-success:hover { background: #0b7d45; }
  .refresh-info { color: #666; font-size: 0.8rem; margin-top: 8px; }
  code { background: #0f3460; padding: 2px 6px; border-radius: 3px; font-size: 0.85rem; }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>🔥 BunIgniter Queue Dashboard</h1>
    <div class="meta">
      ${data.runtime.platform} ${data.runtime.arch} · Bun ${data.runtime.bun} · ${data.serverTime}
    </div>
  </div>
  <div>
    Worker: <span class="status-badge ${data.workerRunning ? "status-running" : "status-stopped"}">${data.workerRunning ? "Running" : "Stopped"}</span>
    Scheduler: <span class="status-badge ${data.schedulerStarted ? "status-running" : "status-stopped"}">${data.schedulerStarted ? "Running" : "Stopped"}</span>
  </div>
</div>

<div class="card-grid">
  <div class="card stat-card">
    <div class="value">${data.queues.reduce((s, q) => s + q.size, 0)}</div>
    <div class="label">Pending Jobs</div>
  </div>
  <div class="card stat-card">
    <div class="value" style="color: #db4437">${data.queues.reduce((s, q) => s + q.failedSize, 0)}</div>
    <div class="label">Failed Jobs</div>
  </div>
  <div class="card stat-card">
    <div class="value" style="color: #f4b400">${data.scheduledJobs.length}</div>
    <div class="label">Scheduled Jobs</div>
  </div>
  <div class="card stat-card">
    <div class="value" style="color: #0f9d58">${data.registeredHandlers.length}</div>
    <div class="label">Handlers</div>
  </div>
</div>

<h2>📊 Queue Status</h2>
<div class="card">
<table>
  <thead>
    <tr><th>Queue</th><th>Pending</th><th>Failed</th><th>Actions</th></tr>
  </thead>
  <tbody>
    ${data.queues
			.map(
				(q) => `<tr>
      <td><code>${q.name}</code></td>
      <td>${q.size}</td>
      <td class="${q.failedSize > 0 ? "error-text" : ""}">${q.failedSize}</td>
      <td>${q.failedSize > 0 ? `<button class="btn btn-danger" onclick="flushFailed('${q.name}')">Flush Failed</button>` : "-"}</td>
    </tr>`,
			)
			.join("\n    ")}
  </tbody>
</table>
</div>

<h2>⏰ Scheduled Jobs</h2>
<div class="card">
<table>
  <thead>
    <tr><th>Name</th><th>Schedule</th><th>Status</th><th>Runs</th><th>Errors</th><th>Last Run</th><th>Next Run</th></tr>
  </thead>
  <tbody>
    ${data.scheduledJobs
			.map(
				(j) => `<tr>
      <td><code>${j.name}</code></td>
      <td>${j.schedule}</td>
      <td><span class="status-badge ${j.enabled ? "status-running" : "status-stopped"}">${j.enabled ? "Active" : "Disabled"}</span></td>
      <td>${j.runCount}</td>
      <td class="${j.errorCount > 0 ? "error-text" : ""}">${j.errorCount}</td>
      <td>${j.lastRunAt ? new Date(j.lastRunAt).toLocaleString() : "-"}</td>
      <td>${j.nextRun ?? "-"}</td>
    </tr>`,
			)
			.join("\n    ")}
  </tbody>
</table>
</div>

<h2>🔧 Registered Handlers</h2>
<div class="card">
  ${
		data.registeredHandlers.length > 0
			? data.registeredHandlers
					.map((h) => `<span class="tag">${h}</span>`)
					.join(" ")
			: '<p style="color:#666">No handlers registered</p>'
	}
</div>

<h2>🖥 Runtime</h2>
<div class="card">
<table>
  <tr><th>Memory RSS</th><td>${(data.runtime.memoryUsage.rss / 1024 / 1024).toFixed(1)} MB</td></tr>
  <tr><th>Heap Used</th><td>${(data.runtime.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB</td></tr>
  <tr><th>Heap Total</th><td>${(data.runtime.memoryUsage.heapTotal / 1024 / 1024).toFixed(1)} MB</td></tr>
  <tr><th>Uptime</th><td>${(data.runtime.uptime / 60).toFixed(1)} min</td></tr>
</table>
</div>

<div class="actions">
  <button class="btn btn-success" onclick="fetch('/_dashboard/api/worker/start',{method:'POST'}).then(()=>location.reload())">Start Worker</button>
  <button class="btn btn-danger" onclick="fetch('/_dashboard/api/worker/stop',{method:'POST'}).then(()=>location.reload())">Stop Worker</button>
  <a href="/_audit" class="btn btn-primary" style="text-decoration:none">📋 Audit Log</a>
  <button class="btn btn-primary" onclick="location.reload()">Refresh</button>
</div>
<div class="refresh-info">Auto-refresh every 10 seconds</div>

<script>
setTimeout(() => location.reload(), 10000);

async function flushFailed(queue) {
  if (confirm('Flush all failed jobs in "' + queue + '"?')) {
    await fetch('/_dashboard/api/queue/' + queue + '/flush-failed', { method: 'POST' });
    location.reload();
  }
}
</script>
</body>
</html>`;
}

// ─── 대시보드 데이터 수집 ──────────────────────────────────

/**
 * 대시보드 데이터 수집
 */
export async function collectDashboardData(
	queueNames: string[] = ["default"],
): Promise<DashboardData> {
	const queues = [];
	for (const name of queueNames) {
		queues.push({
			name,
			size: await Queue.size(name),
			failedSize: await Queue.failedSize(name),
		});
	}

	const scheduledJobs = Scheduler.list().map((j) => ({
		...j,
		nextRun: j.nextRun ? j.nextRun.toISOString() : null,
	}));

	return {
		queues,
		scheduledJobs,
		registeredHandlers: Queue.getRegisteredTypes(),
		workerRunning: Queue.isRunning(),
		schedulerStarted: Scheduler.isStarted(),
		serverTime: new Date().toISOString(),
		runtime: {
			bun: typeof Bun !== "undefined" ? Bun.version : "unknown",
			platform: process.platform,
			arch: process.arch,
			uptime: process.uptime(),
			memoryUsage: process.memoryUsage(),
		},
	};
}

// ─── 대시보드 라우트 생성 ──────────────────────────────────

/**
 * 대시보드 라우트 핸들러 생성
 * Elysia 라우트로 바로 사용 가능
 *
 * 사용법:
 *   import { createDashboardRoutes } from "system/core/dashboard.ts";
 *   const routes = createDashboardRoutes(["default", "emails"]);
 *   // routes를 Elysia 앱에 등록
 */
export function createDashboardRoutes(
	queueNames: string[] = ["default"],
): Array<{
	method: string;
	path: string;
	handler: (ctx: any) => any;
}> {
	return [
		// HTML 대시보드
		{
			method: "GET",
			path: "/_dashboard",
			async handler(_ctx: any) {
				const data = await collectDashboardData(queueNames);
				const html = dashboardHtml(data);
				return new Response(html, {
					headers: { "Content-Type": "text/html; charset=utf-8" },
				});
			},
		},
		// API: 대시보드 데이터
		{
			method: "GET",
			path: "/_dashboard/api",
			async handler(_ctx: any) {
				const data = await collectDashboardData(queueNames);
				return Response.json(data);
			},
		},
		// API: 워커 시작
		{
			method: "POST",
			path: "/_dashboard/api/worker/start",
			handler(_ctx: any) {
				Queue.work(queueNames[0]);
				return Response.json({ ok: true, action: "worker_start" });
			},
		},
		// API: 워커 정지
		{
			method: "POST",
			path: "/_dashboard/api/worker/stop",
			handler(_ctx: any) {
				Queue.stop();
				return Response.json({ ok: true, action: "worker_stop" });
			},
		},
		// API: 실패 잡 삭제
		{
			method: "POST",
			path: "/_dashboard/api/queue/:name/flush-failed",
			async handler(ctx: any) {
				const name = ctx.params?.name ?? queueNames[0];
				await Queue.flushFailed(name);
				return Response.json({ ok: true, action: "flush_failed", queue: name });
			},
		},
		// API: 타임아웃 잡 복구
		{
			method: "POST",
			path: "/_dashboard/api/queue/:name/recover-timeout",
			async handler(ctx: any) {
				const name = ctx.params?.name ?? queueNames[0];
				const count = await Queue.recoverTimeout(name);
				return Response.json({
					ok: true,
					action: "recover_timeout",
					queue: name,
					recovered: count,
				});
			},
		},
		// API: 스케줄드 잡 조회
		{
			method: "GET",
			path: "/_dashboard/api/scheduler",
			handler(_ctx: any) {
				return Response.json(Scheduler.list());
			},
		},
		// API: 스케줄드 잡 활성화/비활성화
		{
			method: "POST",
			path: "/_dashboard/api/scheduler/:name/toggle",
			handler(ctx: any) {
				const name = ctx.params?.name;
				const job = Scheduler.get(name);
				if (!job) {
					return Response.json({ error: "Job not found" }, { status: 404 });
				}
				if (job.enabled) {
					Scheduler.disable(name);
				} else {
					Scheduler.enable(name);
				}
				return Response.json({ ok: true, name, enabled: !job.enabled });
			},
		},
	];
}
