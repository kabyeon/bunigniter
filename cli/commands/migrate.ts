// ============================================================
// migrate - 데이터베이스 마이그레이션 실행
// bun run igniter migrate
// ============================================================

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SQL } from "bun";
import type { Command } from "../registry.ts";

export const migrate: Command = {
	name: "migrate",
	description: "데이터베이스 마이그레이션 실행",
	usage: "bun run igniter migrate",
	async run(_args: string[]): Promise<void> {
		console.log("\n📦 마이그레이션 실행 중...\n");

		const db = new SQL({
			adapter: "sqlite",
			filename: "./database/bunigniter.db",
			create: true,
		});

		// 마이그레이션 추적 테이블
		await db`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        batch INTEGER NOT NULL DEFAULT 1,
        ran_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

		// 현재 배치 번호 조회
		const maxBatch = await db`SELECT MAX(batch) as max_batch FROM migrations`;
		const currentBatch = (maxBatch[0] as any)?.max_batch ?? 0;
		const nextBatch = currentBatch + 1;

		// 이미 실행된 마이그레이션
		const ran = await db`SELECT name FROM migrations ORDER BY ran_at`;
		const ranNames = new Set(ran.map((r: any) => r.name));

		// 마이그레이션 파일 목록
		const migrationsDir = join(process.cwd(), "database", "migrations");

		if (!existsSync(migrationsDir)) {
			console.log("  ⚠️  database/migrations/ 폴더가 없습니다.\n");
			await db.close();
			return;
		}

		let files: string[] = [];
		try {
			files = readdirSync(migrationsDir)
				.filter((f) => f.endsWith(".ts"))
				.sort();
		} catch {
			console.log("  ⚠️  마이그레이션 폴더를 읽을 수 없습니다.\n");
			await db.close();
			return;
		}

		if (files.length === 0) {
			console.log("  📋 실행할 마이그레이션이 없습니다.\n");
			await db.close();
			return;
		}

		// 실행할 마이그레이션 필터링
		const pending = files.filter((f) => !ranNames.has(f));

		if (pending.length === 0) {
			console.log("  ✅ 모든 마이그레이션이 이미 실행되었습니다.\n");
			await db.close();
			return;
		}

		let count = 0;

		for (const file of pending) {
			console.log(`  🔄 실행 중: ${file}`);

			try {
				const mod = await import(join(migrationsDir, file));
				if (mod.up) {
					await mod.up(db);
					await db`INSERT INTO migrations (name, batch) VALUES (${file}, ${nextBatch})`;
					console.log(`  ✅ 완료: ${file}`);
					count++;
				} else {
					console.log(`  ⚠️  up() 함수 없음: ${file}`);
				}
			} catch (err: any) {
				console.log(`  ❌ 실패: ${file} - ${err.message}`);
				break;
			}
		}

		await db.close();

		console.log(`\n✨ ${count}개의 마이그레이션이 실행되었습니다. (batch: ${nextBatch})\n`);
	},
};
