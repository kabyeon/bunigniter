// ============================================================
// migrate - 마이그레이션 실행
// bun run igniter migrate
// ============================================================

import type { Command } from "../registry.ts";
import { PROJECT_ROOT } from "../utils.ts";

export const migrate: Command = {
	name: "migrate",
	description: "데이터베이스 마이그레이션 실행",
	usage: "bun run igniter migrate",
	async run(_args: string[]): Promise<void> {
		console.log(`\n📦 마이그레이션을 실행하려면:\n`);
		console.log(`  bun run migrate\n`);
		console.log(`  또는 직접 실행:`);
		console.log(`  bun run database/migrate.ts\n`);
	},
};
