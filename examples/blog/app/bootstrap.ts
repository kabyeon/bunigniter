import { loadConfig } from "system/core/config.ts";
import type { AppConfig } from "app/config/app.ts";
import { closeAllConnections } from "system/core/database.ts";
import { resolve, relative } from "node:path";

const APP_ROOT = resolve(import.meta.dir);
process.chdir(resolve(import.meta.dir, ".."));
process.env.APP_ROOT = APP_ROOT;

function safeStaticPath(urlPathname: string): string | null {
	const publicDir = resolve(process.cwd(), "public");
	const resolvedPath = resolve(publicDir, urlPathname.replace(/^\//, ""));
	const relPath = relative(publicDir, resolvedPath);
	if (relPath.startsWith("..")) return null;
	return resolvedPath;
}

async function bootstrap() {
	const appConfig = await loadConfig<AppConfig>("app");

	console.log(`
╔══════════════════════════════════════════╗
║          🔥 BunIgniter Blog              ║
╚══════════════════════════════════════════╝
  `);

	// ── 웹 라우트 구성 ──
	const router = (await import("./config/routes.ts")).default;
	router.printRoutes();

	// ── API 라우트 구성 ──
	const apiRouter = (await import("./config/api_routes.ts")).default;
	const { routes: webRoutes, fetch: webFetch } = router.toBunServe();
	const { routes: apiRoutes } = apiRouter.toBunServe();

	// ── OpenAPI ──
	const { getOpenApiSpec, getSwaggerUiHtml } = await import(
		"./config/openapi.ts"
	);
	const openApiSpec = getOpenApiSpec();
	const swaggerHtml = getSwaggerUiHtml();

	console.log(
		"  📖 API 문서: http://localhost:" +
			(process.env.PORT ?? 3001) +
			"/api/docs",
	);
	console.log("");

	// ── 정적 파일 라우트 ──
	const staticRoutes: Record<
		string,
		(req: any) => Response | Bun.BunFile | Promise<Response>
	> = {};
	for (const prefix of ["/css", "/js", "/images"]) {
		staticRoutes[`${prefix}/*`] = (req: any) => {
			try {
				const url = new URL(req.url);
				const safePath = safeStaticPath(url.pathname);
				if (!safePath) return new Response("Not Found", { status: 404 });
				const file = Bun.file(safePath);
				if (file.size === 0) return new Response("Not Found", { status: 404 });
				return new Response(file);
			} catch {
				return new Response("Not Found", { status: 404 });
			}
		};
	}

	// ── OpenAPI 라우트 ──
	const openApiRoutes: Record<
		string,
		(req: any) => Response | Promise<Response>
	> = {
		"/api/docs": () => {
			return new Response(swaggerHtml, {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		},
		"/api/docs/json": () => {
			return new Response(JSON.stringify(openApiSpec, null, 2), {
				headers: { "Content-Type": "application/json" },
			});
		},
	};

	// ── Bun.serve 서버 시작 ──
	const port = Number(process.env.PORT ?? 3001);

	const server = Bun.serve({
		port,
		routes: {
			...staticRoutes,
			...openApiRoutes,
			...apiRoutes,
			...webRoutes,
		} as any,
		fetch(req) {
			try {
				return webFetch(req);
			} catch (err: any) {
				console.error(`[ERROR] ${err.message}`);
				return new Response(
					`<!DOCTYPE html><html><head><meta charset="utf-8"><title>500</title></head><body style="font-family:sans-serif;text-align:center;padding:50px"><h1>500</h1><p>서버 오류</p>${appConfig.debug ? `<pre>${err.message}</pre>` : ""}<a href="/">홈으로</a></body></html>`,
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
	console.log("");

	process.on("SIGINT", async () => {
		console.log("\n  🔇 서버를 종료합니다...");
		await closeAllConnections();
		server.stop();
		process.exit(0);
	});
}

bootstrap().catch((err) => {
	console.error("❌ 부트스트랩 실패:", err);
	process.exit(1);
});
