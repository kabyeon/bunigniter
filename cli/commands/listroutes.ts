// ============================================================
// list:routes - 등록된 라우트 목록 출력
// bun run igniter list:routes
// ============================================================

import type { Command } from "../registry.ts";

export const listRoutes: Command = {
	name: "list:routes",
	description: "등록된 라우트 목록 출력",
	usage: "bun run igniter list:routes",
	async run(_args: string[]): Promise<void> {
		console.log(`\n📋 라우트 목록\n`);
		console.log("  이 명령어는 서버 실행 후 라우트를 표시합니다.");
		console.log("  서버 시작 시 자동으로 라우트 목록이 콘솔에 출력됩니다.\n");
	},
};
