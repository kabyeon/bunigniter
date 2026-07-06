// ============================================================
// make:rollback - 마이그레이션 롤백
// bun run igniter migrate:rollback
// bun run igniter migrate:rollback --steps=3
// bun run igniter migrate:rollback --all
// ============================================================

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { SQL } from "bun";
import type { Command } from "../registry.ts";
import { parseArgs } from "../utils.ts";

export const migrateRollback: Command = {
	name: "migrate:rollback",
	description: "마이그레이션 롤백 (최근 실행한 마이그레이션 되돌리기)",
	usage: "bun run igniter migrate:rollback [--steps=N] [--all]",
	options: [
		{
			flag: "--steps",
			description: "롤백할 마이그레이션 개수 (기본: 1)",
		},
		{
			flag: "--all",
			description: "모든 마이그레이션 롤백",
		},
	],
	async run(args: string[]): Promise<void> {
		const { flags } = parseArgs(args);
		const rollbackAll = !!flags.all;
		const steps = rollbackAll ? Infinity : Number(flags.steps ?? 1);

		console.log("\n⏪ 마이그레이션 롤백 중...\n");

		const db = new SQL({
			adapter: "sqlite",
			filename: "./database/bunigniter.db",
			create: true,
		});

		// 마이그레이션 추적 테이블 확인
		await db`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        batch INTEGER NOT NULL DEFAULT 1,
        ran_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

		// 최근 배치의 마이그레이션 조회 (batch 단위 롤백)
		let ranNames: string[] = [];

		if (rollbackAll) {
			// 전체 롤백: 모든 마이그레이션
			ranNames = (await db`SELECT name FROM migrations ORDER BY batch DESC, ran_at DESC`).map(
				(r: any) => r.name,
			);
		} else {
			// 배치 단위 롤백: 최근 N개 배치
			const maxBatch = await db`SELECT MAX(batch) as max_batch FROM migrations`;
			const currentBatch = (maxBatch[0] as any)?.max_batch ?? 0;

			if (currentBatch === 0) {
				console.log("  📋 롤백할 마이그레이션이 없습니다.\n");
				await db.close();
				return;
			}

			// 롤백할 배치 범위 계산
			const rollbackToBatch = Math.max(0, currentBatch - steps);

			const ran =
				await db`SELECT name FROM migrations WHERE batch > ${rollbackToBatch} ORDER BY batch DESC, ran_at DESC`;
			ranNames = ran.map((r: any) => r.name);
		}

		// 마이그레이션 파일 목록
		const migrationsDir = join(process.cwd(), "database", "migrations");
		let files: string[] = [];
		try {
			files = readdirSync(migrationsDir)
				.filter((f) => f.endsWith(".ts"))
				.sort();
		} catch {
			console.log("  ⚠️  마이그레이션 폴더를 찾을 수 없습니다.");
			await db.close();
			return;
		}

		const toRollback = ranNames;

		let count = 0;

		for (const fileName of toRollback) {
			if (!files.includes(fileName)) {
				console.log(`  ⚠️  파일 없음: ${fileName} (추적 테이블에서만 제거)`);
				await db`DELETE FROM migrations WHERE name = ${fileName}`;
				continue;
			}

			console.log(`  ⏪ 롤백 중: ${fileName}`);

			try {
				const mod = await import(join(migrationsDir, fileName));
				if (mod.down) {
					await mod.down(db);
					await db`DELETE FROM migrations WHERE name = ${fileName}`;
					console.log(`  ✅ 롤백 완료: ${fileName}`);
					count++;
				} else {
					console.log(`  ⚠️  down() 함수 없음: ${fileName}`);
				}
			} catch (err: any) {
				console.log(`  ❌ 롤백 실패: ${fileName} - ${err.message}`);
				break;
			}
		}

		await db.close();

		if (count > 0) {
			console.log(`\n✨ ${count}개의 마이그레이션이 롤백되었습니다.\n`);
		} else {
			console.log("\n📋 롤백된 마이그레이션이 없습니다.\n");
		}
	},
};
