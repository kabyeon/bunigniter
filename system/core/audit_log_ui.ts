// ============================================================
// BunIgniter - Audit Log Web UI
// Bun.serve 기반 감사 로그 대시보드
// HTML + JSON API + SSE 실시간 스트림
// ============================================================

import { AuditLog, type AuditLogEntry } from "./audit_log.ts";

// ─── UI 설정 ──────────────────────────────────────────

export interface AuditLogUIConfig {
	/** UI 기본 경로 */
	basePath: string;
	/** 페이지당 항목 수 */
	perPage: number;
	/** SSE 실시간 업데이트 활성화 */
	enableSSE: boolean;
	/** 큐 이름 (대시보드 링크용) */
	dashboardPath?: string;
}

// ─── 감사 로그 HTML UI 생성 ──────────────────────────────

/**
 * 감사 로그 웹 UI HTML 생성
 */
export function auditLogHtml(
	entries: AuditLogEntry[],
	totalCount: number,
	page: number,
	perPage: number,
	filters: { event?: string; entityType?: string; userId?: string },
	config: AuditLogUIConfig,
): string {
	const totalPages = Math.ceil(totalCount / perPage);
	const basePath = config.basePath;

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BunIgniter Audit Log</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
  h1 { color: #e94560; margin-bottom: 8px; font-size: 1.5rem; }
  h2 { color: #0f3460; background: #16213e; padding: 10px 14px; border-radius: 6px; margin: 20px 0 10px; font-size: 1.1rem; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 12px; }
  .header .meta { color: #888; font-size: 0.85rem; }
  .card { background: #16213e; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .stat-card { text-align: center; }
  .stat-card .value { font-size: 2rem; font-weight: 700; color: #e94560; }
  .stat-card .label { font-size: 0.85rem; color: #888; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #2a2a4a; font-size: 0.85rem; }
  th { color: #e94560; font-weight: 600; cursor: pointer; }
  tr:hover { background: #1a1a3e; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
  .badge-create { background: #0f9d58; color: #fff; }
  .badge-update { background: #f4b400; color: #000; }
  .badge-delete { background: #db4437; color: #fff; }
  .badge-login { background: #4285f4; color: #fff; }
  .badge-custom { background: #0f3460; color: #aaa; }
  .filters { display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap; align-items: center; }
  .filters label { color: #888; font-size: 0.85rem; }
  .filters select, .filters input { background: #0f3460; color: #eee; border: 1px solid #2a2a4a; padding: 6px 10px; border-radius: 4px; font-size: 0.85rem; }
  .filters button { padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; background: #e94560; color: #fff; }
  .filters button:hover { background: #d6304a; }
  .pagination { display: flex; gap: 8px; margin: 16px 0; align-items: center; }
  .pagination a, .pagination span { padding: 6px 12px; border-radius: 4px; font-size: 0.85rem; text-decoration: none; }
  .pagination a { background: #0f3460; color: #eee; }
  .pagination a:hover { background: #1a4a8a; }
  .pagination .current { background: #e94560; color: #fff; }
  .pagination .disabled { background: #2a2a4a; color: #666; cursor: default; }
  .diff-old { color: #db4437; text-decoration: line-through; }
  .diff-new { color: #0f9d58; }
  .detail-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; padding: 40px; }
  .detail-modal.active { display: flex; justify-content: center; align-items: flex-start; }
  .detail-content { background: #16213e; border-radius: 12px; padding: 24px; max-width: 800px; width: 100%; max-height: 80vh; overflow-y: auto; }
  .detail-content h3 { color: #e94560; margin-bottom: 16px; }
  .detail-content pre { background: #0f3460; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; white-space: pre-wrap; }
  .detail-content .close-btn { float: right; background: none; border: none; color: #888; font-size: 1.5rem; cursor: pointer; }
  .detail-content .close-btn:hover { color: #eee; }
  .live-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #0f9d58; margin-right: 6px; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .empty-state { text-align: center; padding: 40px; color: #666; }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>📋 Audit Log</h1>
    <div class="meta">${totalCount} total entries · Page ${page} of ${totalPages || 1}</div>
  </div>
  <div>
    ${config.enableSSE ? '<span class="live-indicator"></span><span style="color:#0f9d58;font-size:0.85rem">Live</span>' : ""}
    ${config.dashboardPath ? `<a href="${config.dashboardPath}" style="color:#4285f4;font-size:0.85rem;text-decoration:none">← Dashboard</a>` : ""}
  </div>
</div>

<div class="card-grid">
  <div class="card stat-card">
    <div class="value">${totalCount}</div>
    <div class="label">Total Entries</div>
  </div>
  <div class="card stat-card">
    <div class="value" style="color:#0f9d58">${entries.filter((e) => e.event === "create").length}</div>
    <div class="label">Creates</div>
  </div>
  <div class="card stat-card">
    <div class="value" style="color:#f4b400">${entries.filter((e) => e.event === "update").length}</div>
    <div class="label">Updates</div>
  </div>
  <div class="card stat-card">
    <div class="value" style="color:#db4437">${entries.filter((e) => e.event === "delete").length}</div>
    <div class="label">Deletes</div>
  </div>
</div>

<h2>🔍 Filters</h2>
<div class="card">
<div class="filters">
  <form method="GET" action="${basePath}" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
    <label>Event:
      <select name="event">
        <option value="">All</option>
        <option value="create" ${filters.event === "create" ? "selected" : ""}>Create</option>
        <option value="update" ${filters.event === "update" ? "selected" : ""}>Update</option>
        <option value="delete" ${filters.event === "delete" ? "selected" : ""}>Delete</option>
        <option value="login" ${filters.event === "login" ? "selected" : ""}>Login</option>
        <option value="custom" ${filters.event === "custom" ? "selected" : ""}>Custom</option>
      </select>
    </label>
    <label>Entity Type:
      <input type="text" name="entity_type" value="${filters.entityType ?? ""}" placeholder="e.g. users">
    </label>
    <label>User ID:
      <input type="text" name="user_id" value="${filters.userId ?? ""}" placeholder="e.g. 1">
    </label>
    <button type="submit">Filter</button>
    <a href="${basePath}" style="color:#888;font-size:0.85rem;text-decoration:none">Reset</a>
  </form>
</div>
</div>

<h2>📊 Entries</h2>
<div class="card">
${
	entries.length > 0
		? `
<table>
  <thead>
    <tr><th>ID</th><th>Event</th><th>Entity</th><th>User</th><th>IP</th><th>Description</th><th>Time</th><th>Details</th></tr>
  </thead>
  <tbody>
    ${entries
			.map(
				(entry) => `
    <tr>
      <td>${entry.id ?? "-"}</td>
      <td><span class="badge badge-${entry.event}">${entry.event}</span></td>
      <td><code>${entry.entity_type}:${entry.entity_id}</code></td>
      <td>${entry.user_id ?? "-"}</td>
      <td>${entry.ip_address}</td>
      <td>${entry.description ?? "-"}</td>
      <td>${entry.created_at ?? "-"}</td>
      <td><button onclick="showDetail(${entry.id ?? 0})" style="background:#0f3460;color:#eee;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-size:0.8rem">View</button></td>
    </tr>`,
			)
			.join("")}
  </tbody>
</table>
`
		: `<div class="empty-state">No audit log entries found</div>`
}
</div>

<div class="pagination">
  ${page > 1 ? `<a href="${basePath}?page=${page - 1}${filters.event ? `&event=${filters.event}` : ""}${filters.entityType ? `&entity_type=${filters.entityType}` : ""}${filters.userId ? `&user_id=${filters.userId}` : ""}">← Prev</a>` : '<span class="disabled">← Prev</span>'}
  <span class="current">${page}</span>
  ${page < totalPages ? `<a href="${basePath}?page=${page + 1}${filters.event ? `&event=${filters.event}` : ""}${filters.entityType ? `&entity_type=${filters.entityType}` : ""}${filters.userId ? `&user_id=${filters.userId}` : ""}">Next →</a>` : '<span class="disabled">Next →</span>'}
</div>

<div id="detail-modal" class="detail-modal" onclick="if(event.target===this)closeDetail()">
  <div class="detail-content">
    <button class="close-btn" onclick="closeDetail()">&times;</button>
    <h3>Audit Log Entry</h3>
    <div id="detail-body">Loading...</div>
  </div>
</div>

${
	config.enableSSE
		? `
<script>
const evtSource = new EventSource("${basePath}/stream");
evtSource.onmessage = (event) => {
  const entry = JSON.parse(event.data);
  // 새 항목 알림 표시
  const badge = document.createElement("div");
  badge.style.cssText = "position:fixed;top:20px;right:20px;background:#16213e;color:#eee;padding:12px 16px;border-radius:8px;border-left:4px solid #e94560;font-size:0.85rem;z-index:9999";
  badge.innerHTML = '<span class=\\"badge badge-' + entry.event + '\\">' + entry.event + '</span> ' + entry.entity_type + ':' + entry.entity_id;
  document.body.appendChild(badge);
  setTimeout(() => badge.remove(), 5000);
};
</script>`
		: ""
}

<script>
async function showDetail(id) {
  const modal = document.getElementById("detail-modal");
  const body = document.getElementById("detail-body");
  modal.classList.add("active");
  body.innerHTML = "Loading...";

  try {
    const res = await fetch("${basePath}/api/" + id);
    const data = await res.json();

    let html = "<table>";
    html += "<tr><th>Field</th><th>Value</th></tr>";
    html += "<tr><td>ID</td><td>" + (data.id ?? "-") + "</td></tr>";
    html += "<tr><td>Event</td><td><span class='badge badge-" + data.event + "'>" + data.event + "</span></td></tr>";
    html += "<tr><td>Entity</td><td><code>" + data.entity_type + ":" + data.entity_id + "</code></td></tr>";
    html += "<tr><td>User ID</td><td>" + (data.user_id ?? "-") + "</td></tr>";
    html += "<tr><td>IP Address</td><td>" + data.ip_address + "</td></tr>";
    html += "<tr><td>Description</td><td>" + (data.description ?? "-") + "</td></tr>";
    html += "<tr><td>Created At</td><td>" + (data.created_at ?? "-") + "</td></tr>";

    if (data.old_values) {
      html += "<tr><td>Old Values</td><td><pre>" + JSON.stringify(JSON.parse(data.old_values), null, 2) + "</pre></td></tr>";
    }
    if (data.new_values) {
      html += "<tr><td>New Values</td><td><pre>" + JSON.stringify(JSON.parse(data.new_values), null, 2) + "</pre></td></tr>";
    }
    html += "</table>";
    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = "<p style='color:#db4437'>Error loading entry: " + err.message + "</p>";
  }
}

function closeDetail() {
  document.getElementById("detail-modal").classList.remove("active");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetail();
});
</script>
</body>
</html>`;
}

// ─── 감사 로그 UI 라우트 생성 ──────────────────────────────

/**
 * 감사 로그 웹 UI 라우트 핸들러 생성
 * Bun.serve 라우트로 사용 가능
 *
 * 사용법:
 *   import { createAuditLogRoutes } from "system/core/audit_log_ui.ts";
 *   const routes = createAuditLogRoutes();
 *   // routes를 앱에 등록
 */
export function createAuditLogRoutes(config?: Partial<AuditLogUIConfig>): Array<{
	method: string;
	path: string;
	handler: (ctx: any) => any;
}> {
	const uiConfig: AuditLogUIConfig = {
		basePath: config?.basePath ?? "/_audit",
		perPage: config?.perPage ?? 25,
		enableSSE: config?.enableSSE ?? true,
		dashboardPath: config?.dashboardPath ?? "/_dashboard",
	};

	return [
		// HTML UI
		{
			method: "GET",
			path: uiConfig.basePath,
			async handler(ctx: any) {
				let url: URL;
				try {
					url = new URL(ctx.request?.url ?? `http://localhost${uiConfig.basePath}`);
				} catch {
					url = new URL(`http://localhost${uiConfig.basePath}`);
				}
				const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
				const event = url.searchParams.get("event") || undefined;
				const entityType = url.searchParams.get("entity_type") || undefined;
				const userId = url.searchParams.get("user_id") || undefined;

				// 필터링된 로그 조회
				let entries: AuditLogEntry[] = [];
				let totalCount = 0;

				try {
					if (event) {
						entries = await AuditLog.getLogsByEvent(event, uiConfig.perPage * page);
					} else if (entityType) {
						entries = await AuditLog.getLogs(entityType, undefined, uiConfig.perPage * page);
					} else if (userId) {
						entries = await AuditLog.getLogsByUser(Number(userId), uiConfig.perPage * page);
					} else {
						// 전체 로그 (가장 최근 항목)
						const model = new (await import("./audit_log.ts")).AuditLogModel();
						entries = await model.findAll();
					}

					totalCount = entries.length;
					entries = entries.slice((page - 1) * uiConfig.perPage, page * uiConfig.perPage);
				} catch {
					// 테이블이 없거나 조회 실패
				}

				const html = auditLogHtml(
					entries,
					totalCount,
					page,
					uiConfig.perPage,
					{ event, entityType, userId },
					uiConfig,
				);
				return new Response(html, {
					headers: { "Content-Type": "text/html; charset=utf-8" },
				});
			},
		},
		// SSE 실시간 스트림
		{
			method: "GET",
			path: `${uiConfig.basePath}/stream`,
			handler(ctx: any) {
				if (!uiConfig.enableSSE) {
					return new Response("SSE disabled", { status: 404 });
				}

				const stream = new ReadableStream({
					start(controller) {
						const encoder = new TextEncoder();
						// 하트비트 전송 (연결 유지)
						const heartbeat = setInterval(() => {
							controller.enqueue(encoder.encode(": heartbeat\n\n"));
						}, 30000);

						// TODO: AuditLog 이벤트 리스너 연동
						// 현재는 연결만 유지, 향후 이벤트 발생 시 push

						// 연결 종료 처리
						const request = ctx.request;
						if (request?.signal) {
							request.signal.addEventListener("abort", () => {
								clearInterval(heartbeat);
								controller.close();
							});
						}
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			},
		},
		// API: 단일 항목 조회
		{
			method: "GET",
			path: `${uiConfig.basePath}/api/:id`,
			async handler(ctx: any) {
				const id = ctx.params?.id;
				if (!id) {
					return Response.json({ error: "Missing id" }, { status: 400 });
				}

				try {
					const { AuditLogModel } = await import("./audit_log.ts");
					const model = new AuditLogModel();
					const entry = await model.findById(Number(id));
					if (!entry) {
						return Response.json({ error: "Not found" }, { status: 404 });
					}
					return Response.json(entry);
				} catch (err: any) {
					return Response.json({ error: err.message }, { status: 500 });
				}
			},
		},
		// API: 엔티티 타입별 로그
		{
			method: "GET",
			path: `${uiConfig.basePath}/api/entity/:type`,
			async handler(ctx: any) {
				const type = ctx.params?.type;
				if (!type) {
					return Response.json({ error: "Missing entity type" }, { status: 400 });
				}

				const entries = await AuditLog.getLogs(type);
				return Response.json(entries);
			},
		},
		// API: 이벤트 타입별 로그
		{
			method: "GET",
			path: `${uiConfig.basePath}/api/event/:event`,
			async handler(ctx: any) {
				const event = ctx.params?.event;
				if (!event) {
					return Response.json({ error: "Missing event type" }, { status: 400 });
				}

				const entries = await AuditLog.getLogsByEvent(event);
				return Response.json(entries);
			},
		},
		// API: 사용자별 로그
		{
			method: "GET",
			path: `${uiConfig.basePath}/api/user/:id`,
			async handler(ctx: any) {
				const id = ctx.params?.id;
				if (!id) {
					return Response.json({ error: "Missing user id" }, { status: 400 });
				}

				const entries = await AuditLog.getLogsByUser(Number(id));
				return Response.json(entries);
			},
		},
		// API: 통계
		{
			method: "GET",
			path: `${uiConfig.basePath}/api/stats`,
			async handler(_ctx: any) {
				try {
					const model = new (await import("./audit_log.ts")).AuditLogModel();
					const all = await model.findAll();

					const stats: Record<string, number> = {};
					for (const entry of all) {
						stats[entry.event] = (stats[entry.event] ?? 0) + 1;
					}

					return Response.json({
						total: all.length,
						byEvent: stats,
						trackedModels: AuditLog.getTrackedModels(),
						enabled: AuditLog.isEnabled(),
					});
				} catch (err: any) {
					return Response.json({ error: err.message }, { status: 500 });
				}
			},
		},
	];
}
