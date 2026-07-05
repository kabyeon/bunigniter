// ============================================================
// serve - 개발 서버 실행
// bun run igniter serve
// ============================================================

import type { Command } from "../registry.ts";

export const serve: Command = {
	name: "serve",
	description: "개발 서버 실행 (핫리로드)",
	usage: "bun run igniter serve",
	async run(_args: string[]): Promise<void> {
		console.log(`\n🚀 개발 서버를 시작하려면 다음 명령어를 사용하세요:\n`);
		console.log(`  bun run dev    (핫리로드 모드)`);
		console.log(`  bun run start  (프로덕션 모드)\n`);
	},
};
