// ============================================================
// list:routes - 등록된 라우트 목록 출력
// bun run bi list:routes
// ============================================================

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "../registry.ts";

export const listRoutes: Command = {
	name: "list:routes",
	description: "등록된 라우트 목록 출력",
	usage: "bun run bi list:routes",
	async run(_args: string[]): Promise<void> {
		console.log("\n📋 라우트 목록\n");

		const routesFile = join(process.cwd(), "app", "config", "routes.ts");

		if (!existsSync(routesFile)) {
			console.log("  ⚠️  app/config/routes.ts 파일이 없습니다.\n");
			return;
		}

		try {
			const content = readFileSync(routesFile, "utf-8");

			// 라우트 등록 패턴 추출
			const routes: { method: string; path: string }[] = [];

			// HTTP 메서드 라우트
			const methodPattern =
				/\b(?:router|apiRouter)\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g;
			let match;
			while ((match = methodPattern.exec(content)) !== null) {
				routes.push({ method: match[1].toUpperCase(), path: match[2] });
			}

			// 리소스 라우트
			const resourcePattern = /\b(?:router|apiRouter)\.resource\s*\(\s*["']([^"']+)["']/g;
			while ((match = resourcePattern.exec(content)) !== null) {
				const base = match[1];
				routes.push({ method: "GET", path: base });
				routes.push({ method: "GET", path: `${base}/:id` });
				routes.push({ method: "GET", path: `${base}/create` });
				routes.push({ method: "POST", path: base });
				routes.push({ method: "GET", path: `${base}/:id/edit` });
				routes.push({ method: "PUT", path: `${base}/:id` });
				routes.push({ method: "DELETE", path: `${base}/:id` });
			}

			if (routes.length === 0) {
				console.log("  📋 등록된 라우트가 없습니다.\n");
				console.log("  💡 app/config/routes.ts 에 라우트를 추가하세요.\n");
				return;
			}

			// 정렬 및 출력
			const methodColors: Record<string, string> = {
				GET: "\x1b[32m",
				POST: "\x1b[33m",
				PUT: "\x1b[34m",
				PATCH: "\x1b[35m",
				DELETE: "\x1b[31m",
			};

			for (const route of routes) {
				const color = methodColors[route.method] ?? "\x1b[0m";
				const method = `${color}${route.method.padEnd(7)}\x1b[0m`;
				console.log(`  ${method} ${route.path}`);
			}

			console.log(`\n  총 ${routes.length}개 라우트\n`);
		} catch (err: any) {
			console.log(`  ❌ 라우트 파일 읽기 실패: ${err.message}\n`);
		}
	},
};
