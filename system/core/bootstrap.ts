// ============================================================
// BunIgniter - Bootstrap (진입점)
// CodeIgniter3 의 index.php 와 동일
// ============================================================

import { Elysia, NotFound } from "elysia";
import { loadConfig } from "./config.ts";
import type { AppConfig } from "../../app/config/app.ts";
import { closeAllConnections } from "./database.ts";
import { logger } from "./logger.ts";
import { resolve, relative } from "node:path";

/**
 * 정적 파일 경로 검증 (Path Traversal 방지)
 * 요청 경로가 public/ 디렉토리 내부인지 확인
 */
function safeStaticPath(urlPathname: string): string | null {
	const publicDir = resolve(process.cwd(), "public");
	const resolvedPath = resolve(
		process.cwd(),
		"public",
		urlPathname.replace(/^\//, ""),
	);
	const relativePath = relative(publicDir, resolvedPath);

	// 경로가 public/ 외부를 가리키면 거부
	if (
		relativePath.startsWith("..") ||
		(resolve(publicDir) !== resolvedPath && !relativePath.startsWith("public"))
	) {
		return null;
	}

	return resolvedPath;
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

	// Elysia 앱 생성
	const app = new Elysia();

	// 정적 파일 서비스 (public/) — Path Traversal 방지 적용
	const staticPrefixes = ["/css", "/js", "/images", "/uploads"];
	for (const prefix of staticPrefixes) {
		app.get(`${prefix}/*`, ({ request }) => {
			try {
				const url = new URL(request.url);
				const safePath = safeStaticPath(url.pathname);
				if (!safePath) {
					return new Response("Not Found", { status: 404 });
				}
				const file = Bun.file(safePath);
				if (file.size === 0) {
					return new Response("Not Found", { status: 404 });
				}
				return file;
			} catch {
				return new Response("Not Found", { status: 404 });
			}
		});
	}

	// 에러 핸들링 - Elysia 2.0 error() API
	app.error(NotFound, ({ set }) => {
		set.status = 404;
		return new Response(
			`<!DOCTYPE html><html><head><meta charset="utf-8"><title>404 - 페이지를 찾을 수 없습니다</title></head><body style="font-family:sans-serif;text-align:center;padding:50px"><h1>404</h1><p>요청하신 페이지를 찾을 수 없습니다.</p><a href="/">홈으로 돌아가기</a></body></html>`,
			{ headers: { "Content-Type": "text/html; charset=utf-8" } },
		);
	});

	app.error(({ error: err, set }) => {
		console.error(`[ERROR] ${err.message}`);
		set.status = 500;
		return new Response(
			`<!DOCTYPE html><html><head><meta charset="utf-8"><title>500 - 서버 오류</title></head><body style="font-family:sans-serif;text-align:center;padding:50px"><h1>500</h1><p>서버 내부 오류가 발생했습니다.</p>${appConfig.debug ? `<pre>${err.message}</pre>` : ""}<a href="/">홈으로 돌아가기</a></body></html>`,
			{ headers: { "Content-Type": "text/html; charset=utf-8" } },
		);
	});

	// 라우트 등록
	const router = (await import("../../app/config/routes.ts")).default;
	router.register(app);
	router.printRoutes();

	// 서버 시작
	const port = Number(process.env.PORT ?? 3000);
	app.listen(port);

	console.log(`  🚀 서버 실행 중: http://localhost:${port}`);
	console.log(`  📦 환경: ${appConfig.env}`);
	console.log(`  🗄️  데이터베이스: SQLite`);
	console.log(`  🎨 템플릿 엔진: Rendu`);
	console.log("");

	logger.info(
		`BunIgniter 서버 시작: http://localhost:${port} (${appConfig.env})`,
	);

	// 종료 시 정리
	process.on("SIGINT", async () => {
		logger.info("서버 종료 신호 수신 (SIGINT)");
		console.log("\n\n  🔇 서버를 종료합니다...");
		await closeAllConnections();
		process.exit(0);
	});
}

bootstrap().catch((err) => {
	console.error("❌ 부트스트랩 실패:", err);
	process.exit(1);
});
