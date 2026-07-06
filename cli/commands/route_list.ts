// ============================================================
// BunIgniter - Route List 공통 함수
// list:routes 명령어와 REPL .routes 가 동일한 로직 사용
// 출력: 메서드 | 경로 | 핸들러 (클래스.메서드)
// ============================================================

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface RouteEntry {
	method: string;
	path: string;
	handler: string;
}

/** 메서드별 색상 */
const METHOD_COLORS: Record<string, string> = {
	GET: "\x1b[32m",
	POST: "\x1b[33m",
	PUT: "\x1b[34m",
	PATCH: "\x1b[35m",
	DELETE: "\x1b[31m",
	AUTO: "\x1b[36m",
};

/** 컨트롤러 변수명 → 클래스명 매핑 */
function extractControllerMap(content: string): Map<string, string> {
	const map = new Map<string, string>();

	// import xxxController from "app/controllers/yyy_controller.ts"
	// import xxx from "app/controllers/xxx_controller.ts"
	const importPattern = /import\s+(\w+)\s+from\s+["']([^"']*_controller\.ts)["']/g;
	let match;
	while ((match = importPattern.exec(content)) !== null) {
		const varName = match[1];
		const filePath = match[2];

		// 파일경로에서 클래스명 유추
		// app/controllers/post_controller.ts → PostController
		// app/controllers/api/auth_controller.ts → AuthController
		const basename = filePath.split("/").pop()!.replace("_controller.ts", "");
		const className = `${basename
			.split("_")
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join("")}Controller`;

		map.set(varName, className);
	}

	return map;
}

/** routes.ts 파일에서 라우트 파싱 */
export function parseRoutesFromFile(routesFilePath?: string): RouteEntry[] {
	const routesFile = routesFilePath ?? join(process.cwd(), "app", "config", "routes.ts");

	if (!existsSync(routesFile)) {
		return [];
	}

	const content = readFileSync(routesFile, "utf-8");

	// 주석 줄 제거 (// 로 시작하는 줄)
	const activeContent = content
		.split("\n")
		.filter((line) => !line.trim().startsWith("//"))
		.join("\n");

	const controllerMap = extractControllerMap(content); // import는 주석도 포함해서 매핑
	const routes: RouteEntry[] = [];

	// HTTP 메서드 라우트
	// router.get("/path", controllerVar, "methodName")
	const methodPattern =
		/\b(?:router|apiRouter)\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']\s*,\s*(\w+)\s*,\s*["'](\w+)["']/g;
	let match;
	while ((match = methodPattern.exec(activeContent)) !== null) {
		const method = match[1].toUpperCase();
		const path = match[2];
		const varName = match[3];
		const methodName = match[4];
		const className = controllerMap.get(varName) ?? varName;
		routes.push({ method, path, handler: `${className}.${methodName}` });
	}

	// 리소스 라우트
	// router.resource("name", controllerVar)
	const resourcePattern = /\b(?:router|apiRouter)\.resource\s*\(\s*["']([^"']+)["']\s*,\s*(\w+)/g;
	while ((match = resourcePattern.exec(activeContent)) !== null) {
		const base = match[1];
		const varName = match[2];
		const className = controllerMap.get(varName) ?? varName;
		routes.push({ method: "GET", path: base, handler: `${className}.index` });
		routes.push({ method: "GET", path: `${base}/create`, handler: `${className}.create` });
		routes.push({ method: "POST", path: base, handler: `${className}.store` });
		routes.push({ method: "GET", path: `${base}/:id`, handler: `${className}.show` });
		routes.push({ method: "GET", path: `${base}/:id/edit`, handler: `${className}.edit` });
		routes.push({ method: "PUT", path: `${base}/:id`, handler: `${className}.update` });
		routes.push({ method: "DELETE", path: `${base}/:id`, handler: `${className}.delete` });
	}

	// 오토 라우트 감지
	if (/\bautoRoute\s*\(/.test(activeContent)) {
		routes.push({ method: "AUTO", path: "/*", handler: "AutoRouter (CI3 호환)" });
	}

	return routes;
}

/** 라우트 목록 컬러 출력 (표 형식) */
export function printRoutes(routes: RouteEntry[]): void {
	if (routes.length === 0) {
		console.log("  📋 등록된 라우트가 없습니다.\n");
		console.log("  💡 app/config/routes.ts 에 라우트를 추가하세요.\n");
		return;
	}

	// 컬럼 너비 계산
	const maxMethod = 7;
	const maxPath = Math.max(...routes.map((r) => r.path.length), 6);
	const maxHandler = Math.max(...routes.map((r) => r.handler.length), 8);

	// 헤더
	const header = `  ${"Method".padEnd(maxMethod)}  ${"Path".padEnd(maxPath)}  ${"Handler".padEnd(maxHandler)}`;
	const separator = `  ${"─".repeat(maxMethod)}  ${"─".repeat(maxPath)}  ${"─".repeat(maxHandler)}`;
	console.log(`\n📋 라우트 목록\n`);
	console.log(header);
	console.log(separator);

	for (const route of routes) {
		const color = METHOD_COLORS[route.method] ?? "\x1b[0m";
		const reset = "\x1b[0m";
		const method = `${color}${route.method.padEnd(maxMethod)}${reset}`;
		const pathStr = route.path.padEnd(maxPath);
		const handler = route.handler.padEnd(maxHandler);
		console.log(`  ${method}  ${pathStr}  ${handler}`);
	}

	console.log(separator);
	console.log(`\n  총 ${routes.length}개 라우트\n`);
}
