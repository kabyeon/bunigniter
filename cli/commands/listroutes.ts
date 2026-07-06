// ============================================================
// list:routes - 등록된 라우트 목록 출력
// bun run bi list:routes
// 공통 함수 route_list.ts 사용 (REPL .routes 와 동일)
// ============================================================

import type { Command } from "../registry.ts";
import { parseRoutesFromFile, printRoutes } from "./route_list.ts";

export const listRoutes: Command = {
	name: "list:routes",
	description: "등록된 라우트 목록 출력",
	usage: "bun run bi list:routes",
	async run(_args: string[]): Promise<void> {
		const routes = parseRoutesFromFile();
		printRoutes(routes);
	},
};
