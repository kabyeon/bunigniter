// ============================================================
// BunIgniter - Bootstrap (진입점)
// CodeIgniter3 의 index.php 와 동일
// Bun.serve 네이티브 HTTP 서버
// ============================================================

import { relative, resolve } from "node:path";
import { loadConfig } from "./config.ts";
import type { AppConfig } from "./config_types.ts";
import { closeAllConnections } from "./database.ts";
import { logger } from "./logger.ts";

/**
 * 정적 파일 경로 검증 (Path Traversal 방지)
 * 요청 경로가 public/ 디렉토리 내부인지 확인
 */
function safeStaticPath(urlPathname: string): string | null {
	const publicDir = resolve(process.cwd(), "public");
	const resolvedPath = resolve(process.cwd(), "public", urlPathname.replace(/^\//, ""));
	const relativePath = relative(publicDir, resolvedPath);

	// 경로가 public/ 외부를 가리키면 거부
	if (relativePath.startsWith("..")) {
		return null;
	}

	return resolvedPath;
}

/**
 * 대시보드/감사 로그 라우트를 Bun.serve routes 형식으로 변환
 */
function adaptRoutes(
	routes: Array<{ method: string; path: string; handler: (ctx: any) => any }>,
): Record<string, (req: any) => Response | Promise<Response>> {
	const result: Record<string, (req: any) => Response | Promise<Response>> = {};

	for (const route of routes) {
		result[route.path] = async (req: any) => {
			// HTTP 메서드 검증
			if (req.method !== route.method) {
				return new Response("Method Not Allowed", { status: 405 });
			}
			return route.handler({ request: req, params: req.params ?? {} });
		};
	}

	return result;
}

async function bootstrap() {
	// 설정 로드
	const appConfig = await loadConfig<AppConfig>("app");

	console.log(`
╔══════════════════════════════════════════════════════════╗
║                    🔥 BunIgniter                         ║
║          CodeIgniter 3-Style MVC Framework               ║
╚══════════════════════════════════════════════════════════╝
  `);

	// ── 라우트 구성 ──────────────────────────────────
	const { getAppRoot } = await import("./config.ts");
	const appRoot = getAppRoot();
	const router = (await import(`${appRoot}/config/routes.ts`)).default;
	router.printRoutes();
	const { routes: appRoutes, fetch: appFetch } = router.toBunServe();

	// ── 정적 파일 라우트 ──────────────────────────────
	const staticRoutes: Record<string, (req: any) => Response | Bun.BunFile | Promise<Response>> = {};
	for (const prefix of ["/css", "/js", "/images", "/uploads"]) {
		staticRoutes[`${prefix}/*`] = (req: any) => {
			try {
				const url = new URL(req.url);
				const safePath = safeStaticPath(url.pathname);
				if (!safePath) {
					return new Response("Not Found", { status: 404 });
				}
				const file = Bun.file(safePath);
				if (file.size === 0) {
					return new Response("Not Found", { status: 404 });
				}
				return new Response(file);
			} catch {
				return new Response("Not Found", { status: 404 });
			}
		};
	}

	// ── 대시보드 라우트 ────────────────────────────────
	let dashboardRoutes: Record<string, any> = {};
	try {
		const { createDashboardRoutes } = await import("./dashboard.ts");
		dashboardRoutes = adaptRoutes(createDashboardRoutes());
	} catch {
		// 대시보드 비활성
	}

	// ── 감사 로그 라우트 ──────────────────────────────
	let auditRoutes: Record<string, any> = {};
	try {
		const { createAuditLogRoutes } = await import("./audit_log_ui.ts");
		auditRoutes = adaptRoutes(createAuditLogRoutes());
	} catch {
		// 감사 로그 UI 비활성
	}

	// ── SSE 라우트 ────────────────────────────────────
	let sseRoutes: Record<string, any> = {};
	try {
		const { createSSERoutes } = await import("./sse.ts");
		sseRoutes = adaptRoutes(createSSERoutes());
	} catch {
		// SSE 비활성
	}

	// ── Bun.serve 서버 시작 ──────────────────────────
	const port = Number(process.env.PORT ?? 3000);

	const server = Bun.serve({
		port,
		routes: {
			...staticRoutes,
			...dashboardRoutes,
			...auditRoutes,
			...sseRoutes,
			...appRoutes,
		},
		fetch(req) {
			// Router에서 매칭되지 않은 요청 → 404
			try {
				return appFetch(req);
			} catch (err: any) {
				console.error(`[ERROR] ${err.message}`);
				return new Response(
					`<!DOCTYPE html><html><head><meta charset="utf-8"><title>500 - 서버 오류</title></head><body style="font-family:sans-serif;text-align:center;padding:50px"><h1>500</h1><p>서버 내부 오류가 발생했습니다.</p>${appConfig.debug ? `<pre>${err.message}</pre>` : ""}<a href="/">홈으로 돌아가기</a></body></html>`,
					{
						status: 500,
						headers: { "Content-Type": "text/html; charset=utf-8" },
					},
				);
			}
		},
	});

	console.log(`  🚀 서버 실행 중: http://localhost:${port}`);
	console.log(`  📦 환경: ${appConfig.env}`);
	console.log(`  🗄️  데이터베이스: SQLite`);
	console.log(`  🎨 템플릿 엔진: 자체 내장`);
	console.log(`  ⚡ 서버: Bun.serve (네이티브)`);
	console.log("");

	logger.info(`BunIgniter 서버 시작: http://localhost:${port} (${appConfig.env})`);

	// 종료 시 정리
	process.on("SIGINT", async () => {
		logger.info("서버 종료 신호 수신 (SIGINT)");
		console.log("\n\n  🔇 서버를 종료합니다...");
		await closeAllConnections();
		server.stop();
		process.exit(0);
	});
}

bootstrap().catch((err) => {
	console.error("❌ 부트스트랩 실패:", err);
	process.exit(1);
});
