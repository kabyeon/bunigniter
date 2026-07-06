// ============================================================
// make:middleware - 미들웨어 생성
// bun run igniter make:middleware auth
// ============================================================

import type { Command } from "../registry.ts";
import { createFile, toPascalCase, toSnakeCase } from "../utils.ts";

function generateMiddleware(name: string): string {
	const pascal = toPascalCase(name);

	return `import type { MiddlewareContext } from "system/core/middleware.ts";

/**
 * ${pascal} 미들웨어
 * 사용법: route.use(${pascal}Middleware)
 */
export async function ${pascal[0].toLowerCase() + pascal.slice(1)}Middleware({ request, response, next }: MiddlewareContext): Promise<Response | void> {
  // 미들웨어 로직을 작성하세요
  // 예: 인증 확인, 권한 체크, 로깅 등

  // 다음 미들웨어/핸들러로 진행
  return next();
}

export default ${pascal[0].toLowerCase() + pascal.slice(1)}Middleware;
`;
}

export const makeMiddleware: Command = {
	name: "make:middleware",
	description: "새 미들웨어 생성",
	usage: "bun run igniter make:middleware <name>",
	async run(args: string[]): Promise<void> {
		const name = args[0];

		if (!name) {
			console.log("❌ 미들웨어 이름을 입력하세요.");
			console.log("   예: bun run igniter make:middleware auth");
			return;
		}

		const snake = toSnakeCase(name);
		const fileName = `${snake}_middleware.ts`;

		console.log(`\n🔨 미들웨어 생성: ${toPascalCase(name)}Middleware\n`);

		const content = generateMiddleware(name);
		createFile(`app/middleware/${fileName}`, content);

		console.log(`\n✨ 완료! app/middleware/${fileName}\n`);
	},
};
