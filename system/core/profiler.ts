// ============================================================
// BunIgniter - Profiler (성능 프로파일링)
// CodeIgniter3 의 Profiler 라이브러리와 동일
// 벤치마크, 실행된 쿼리, 메모리 사용량, 요청 데이터 표시
// ============================================================

import { logger } from "./logger.ts";

/**
 * 벤치마크 포인트
 */
export interface BenchmarkPoint {
	name: string;
	startTime: number;
	endTime?: number;
	memoryStart: number;
	memoryEnd?: number;
}

/**
 * 쿼리 로그 항목
 */
export interface QueryLogEntry {
	sql: string;
	bindings: any[];
	durationMs: number;
	timestamp: number;
}

/**
 * 프로파일러 데이터
 */
export interface ProfilerData {
	/** 벤치마크 포인트들 */
	benchmarks: Array<{
		name: string;
		durationMs: number;
		memoryDeltaBytes: number;
	}>;
	/** 실행된 쿼리 목록 */
	queries: QueryLogEntry[];
	/** 메모리 사용량 (bytes) */
	memoryUsage: {
		current: number;
		peak: number;
	};
	/** 요청 정보 */
	request: {
		method: string;
		url: string;
		headers: Record<string, string>;
		query: Record<string, string>;
		body: any;
	};
	/** 응답 정보 */
	response: {
		status: number;
		durationMs: number;
	};
	/** 포함된 파일 */
	loadedFiles: number;
}

/**
 * 프로파일러
 *
 * 사용법:
 *   import { Profiler } from "system/core/profiler.ts";
 *
 *   // 미들웨어/컨트롤러에서
 *   Profiler.start("request");
 *   // ... 작업 ...
 *   Profiler.end("request");
 *
 *   // 쿼리 로깅
 *   Profiler.logQuery(sql, bindings, durationMs);
 *
 *   // 데이터 조회
 *   const data = Profiler.getData();
 *
 *   // 개발 환경에서 HTML 오버레이 렌더링
 *   const html = Profiler.render();
 *
 * CI3: $this->output->enable_profiler(true);
 */
export class Profiler {
	private static enabled: boolean = false;
	private static benchmarks: Map<string, BenchmarkPoint> = new Map();
	private static queries: QueryLogEntry[] = [];
	private static requestStartTime: number = 0;

	/**
	 * 프로파일러 활성화/비활성화
	 * CI3: $this->output->enable_profiler(TRUE)
	 */
	static enable(enabled: boolean = true): void {
		Profiler.enabled = enabled;
		if (enabled) {
			Profiler.requestStartTime = performance.now();
			logger.debug("Profiler 활성화됨");
		}
	}

	/**
	 * 프로파일러 활성화 여부
	 */
	static isEnabled(): boolean {
		return Profiler.enabled;
	}

	/**
	 * 벤치마크 시작
	 * CI3: $this->benchmark->mark('point_start')
	 *
	 * 사용법:
	 *   Profiler.start('db_query');
	 *   await db`SELECT ...`;
	 *   Profiler.end('db_query');
	 */
	static start(name: string): void {
		if (!Profiler.enabled) return;
		Profiler.benchmarks.set(name, {
			name,
			startTime: performance.now(),
			memoryStart: process.memoryUsage().heapUsed,
		});
	}

	/**
	 * 벤치마크 종료
	 * CI3: $this->benchmark->mark('point_end')
	 */
	static end(name: string): void {
		if (!Profiler.enabled) return;
		const point = Profiler.benchmarks.get(name);
		if (!point) {
			logger.warn(`Profiler: 종료되지 않은 포인트 '${name}'`);
			return;
		}
		point.endTime = performance.now();
		point.memoryEnd = process.memoryUsage().heapUsed;
	}

	/**
	 * 벤치마크 시간 측정 (콜백)
	 *
	 * 사용법:
	 *   const result = await Profiler.benchmark('db_query', async () => {
	 *     return await db`SELECT * FROM users`;
	 *   });
	 */
	static async benchmark<T>(name: string, callback: () => Promise<T> | T): Promise<T> {
		Profiler.start(name);
		try {
			return await callback();
		} finally {
			Profiler.end(name);
		}
	}

	/**
	 * 쿼리 로깅
	 * QueryBuilder/Model에서 자동 호출
	 */
	static logQuery(sql: string, bindings: any[], durationMs: number): void {
		if (!Profiler.enabled) return;
		Profiler.queries.push({ sql, bindings, durationMs, timestamp: Date.now() });
	}

	/**
	 * 프로파일러 데이터 수집
	 */
	static getData(): ProfilerData {
		const benchmarks = [...Profiler.benchmarks.values()]
			.filter((p) => p.endTime !== undefined)
			.map((p) => ({
				name: p.name,
				durationMs: p.endTime! - p.startTime,
				memoryDeltaBytes: (p.memoryEnd ?? 0) - p.memoryStart,
			}));

		const memUsage = process.memoryUsage();

		return {
			benchmarks,
			queries: Profiler.queries,
			memoryUsage: {
				current: memUsage.heapUsed,
				peak: (memUsage as any).heapPeak ?? memUsage.heapUsed,
			},
			request: {
				method: "",
				url: "",
				headers: {},
				query: {},
				body: null,
			},
			response: {
				status: 0,
				durationMs:
					Profiler.requestStartTime > 0 ? performance.now() - Profiler.requestStartTime : 0,
			},
			loadedFiles: Object.keys(require.cache ?? {}).length,
		};
	}

	/**
	 * 프로파일러 데이터 초기화
	 */
	static reset(): void {
		Profiler.benchmarks.clear();
		Profiler.queries = [];
		Profiler.requestStartTime = performance.now();
	}

	/**
	 * HTML 오버레이 렌더링 (개발 환경)
	 * CI3 Profiler Bar와 유사하게 페이지 하단에 표시
	 */
	static render(request?: Request): string {
		if (!Profiler.enabled) return "";

		const data = Profiler.getData();
		const totalQueries = data.queries.length;
		const totalQueryTime = data.queries.reduce((sum, q) => sum + q.durationMs, 0);

		const benchmarksHtml = data.benchmarks
			.map(
				(b) => `
        <tr>
          <td>${escapeHtml(b.name)}</td>
          <td>${b.durationMs.toFixed(2)}ms</td>
          <td>${formatBytes(b.memoryDeltaBytes)}</td>
        </tr>`,
			)
			.join("");

		const queriesHtml = data.queries
			.map(
				(q) => `
        <tr>
          <td><code>${escapeHtml(q.sql)}</code></td>
          <td>${q.bindings.length > 0 ? escapeHtml(JSON.stringify(q.bindings)) : "—"}</td>
          <td>${q.durationMs.toFixed(2)}ms</td>
        </tr>`,
			)
			.join("");

		const reqMethod = request?.method ?? "—";
		const reqUrl = request?.url ?? "—";

		return `
<!-- BunIgniter Profiler -->
<div id="bunigniter-profiler" style="position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;color:#e0e0e0;font-family:monospace;font-size:12px;max-height:300px;overflow:auto;z-index:99999;border-top:2px solid #0f3460;box-shadow:0 -4px 10px rgba(0,0,0,0.3)">
  <div style="background:#0f3460;padding:8px 16px;display:flex;gap:20px;align-items:center">
    <strong style="color:#e94560">🔥 BunIgniter Profiler</strong>
    <span>${data.response.durationMs.toFixed(2)}ms</span>
    <span>쿼리 ${totalQueries}개 (${totalQueryTime.toFixed(2)}ms)</span>
    <span>메모리: ${formatBytes(data.memoryUsage.current)} / ${formatBytes(data.memoryUsage.peak)} (peak)</span>
    <span>${data.loadedFiles} 파일 로드</span>
    <button onclick="document.getElementById('bunigniter-profiler-body').style.display=document.getElementById('bunigniter-profiler-body').style.display==='none'?'block':'none'" style="margin-left:auto;background:#e94560;color:white;border:none;padding:4px 12px;cursor:pointer;border-radius:3px">토글</button>
  </div>
  <div id="bunigniter-profiler-body" style="padding:12px 16px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <h4 style="color:#e94560;margin:0 0 8px">📊 벤치마크</h4>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="text-align:left;color:#999"><th>포인트</th><th>시간</th><th>메모리</th></tr></thead>
          <tbody>${benchmarksHtml || '<tr><td colspan="3" style="color:#999">측정된 포인트 없음</td></tr>'}</tbody>
        </table>
      </div>
      <div>
        <h4 style="color:#e94560;margin:0 0 8px">🗄️ 쿼리 (${totalQueries})</h4>
        <div style="max-height:200px;overflow:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="text-align:left;color:#999"><th>SQL</th><th>바인딩</th><th>시간</th></tr></thead>
            <tbody>${queriesHtml || '<tr><td colspan="3" style="color:#999">실행된 쿼리 없음</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div style="margin-top:12px">
      <h4 style="color:#e94560;margin:0 0 8px">🌐 요청</h4>
      <div style="color:#aaa">
        <strong>${escapeHtml(reqMethod)}</strong> ${escapeHtml(reqUrl)}
      </div>
    </div>
  </div>
</div>`;
	}
}

// ─── 유틸리티 ──────────────────────────────────────────

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
	const sign = bytes < 0 ? "-" : "";
	return `${sign}${(Math.abs(bytes) / 1024 ** i).toFixed(1)} ${units[i]}`;
}
