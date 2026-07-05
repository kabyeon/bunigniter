// ============================================================
// BunIgniter - Bootstrap (진입점)
// CodeIgniter3 의 index.php 와 동일
// ============================================================

import { Elysia, NotFound } from "elysia";
import { loadConfig } from "./config.ts";
import type { AppConfig } from "../../app/config/app.ts";
import { closeAllConnections } from "./database.ts";
import { logger } from "./logger.ts";

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

	// 정적 파일 서비스 (public/)
	app.get("/css/*", ({ request }) => {
		try {
			const url = new URL(request.url);
			const filePath = `./public${url.pathname}`;
			return Bun.file(filePath);
		} catch {
			return new Response("Not Found", { status: 404 });
		}
	});

	app.get("/js/*", ({ request }) => {
		try {
			const url = new URL(request.url);
			const filePath = `./public${url.pathname}`;
			return Bun.file(filePath);
		} catch {
			return new Response("Not Found", { status: 404 });
		}
	});

	app.get("/images/*", ({ request }) => {
		try {
			const url = new URL(request.url);
			const filePath = `./public${url.pathname}`;
			return Bun.file(filePath);
		} catch {
			return new Response("Not Found", { status: 404 });
		}
	});

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
