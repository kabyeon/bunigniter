// ============================================================
// BunIgniter - Route Generator
// 스캐폴딩 시 라우트 코드를 자동 생성
// app/config/routes.ts 에 추가할 라우트 코드를 생성합니다.
// ============================================================

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toPascalCase, toPlural, toSnakeCase } from "../utils.ts";

export interface RouteGenOptions {
	name: string;
	isApi: boolean;
}

/**
 * 라우트 코드를 생성합니다.
 */
export function generateRouteCode(options: RouteGenOptions): string {
	const { name, isApi } = options;
	const snake = toSnakeCase(name);
	const plural = toPlural(snake);

	if (isApi) {
		// API 모드: /api prefix + JSON 컨트롤러
		return [
			`// API: ${toPascalCase(name)}`,
			`import ${snake}_controller from "app/controllers/${snake}_controller.ts";`,
			`router.group("/api", [], (apiRouter) => {`,
			`  apiRouter.resource("${plural}", ${snake}_controller);`,
			`});`,
		].join("\n");
	}

	// 웹 모드: 일반 리소스 라우트
	return [
		`// ${toPascalCase(name)}`,
		`import ${snake}_controller from "app/controllers/${snake}_controller.ts";`,
		`router.resource("${plural}", ${snake}_controller);`,
	].join("\n");
}

/**
 * 생성된 라우트 코드를 routes.ts 파일에 자동으로 추가합니다.
 */
export function appendRouteToFile(projectRoot: string, options: RouteGenOptions): boolean {
	const routeFile = join(projectRoot, "app", "config", "routes.ts");

	if (!existsSync(routeFile)) {
		return false;
	}

	const content = readFileSync(routeFile, "utf-8");
	const snake = toSnakeCase(options.name);

	// 이미 존재하는지 확인
	if (content.includes(`${snake}_controller`)) {
		console.log(`  ⚠️  라우트가 이미 존재합니다: ${snake}_controller`);
		return false;
	}

	const routeCode = generateRouteCode(options);

	// export default 앞에 추가
	if (content.includes("export default")) {
		const updated = content.replace("export default", `${routeCode}\n\nexport default`);
		writeFileSync(routeFile, updated, "utf-8");
	} else {
		writeFileSync(routeFile, `${content}\n\n${routeCode}`, "utf-8");
	}

	return true;
}
