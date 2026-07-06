// ============================================================
// migrate:status - 마이그레이션 상태 표시
// bun run igniter migrate:status
// ============================================================

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SQL } from "bun";
import type { Command } from "../registry.ts";

export const migrateStatus: Command = {
	name: "migrate:status",
	description: "마이그레이션 상태 표시 (적용/미적용)",
	usage: "bun run igniter migrate:status",
	async run(_args: string[]): Promise<void> {
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

		// 실행된 마이그레이션 조회
		const ran = await db`SELECT name, batch, ran_at FROM migrations ORDER BY batch, ran_at`;
		const ranMap = new Map<string, { batch: number; ranAt: string }>();
		for (const r of ran as any[]) {
			ranMap.set(r.name, { batch: r.batch, ranAt: r.ran_at });
		}

		// 마이그레이션 파일 목록
		const migrationsDir = join(process.cwd(), "database", "migrations");

		if (!existsSync(migrationsDir)) {
			console.log("\n  ⚠️  database/migrations/ 폴더가 없습니다.\n");
			await db.close();
			return;
		}

		let files: string[] = [];
		try {
			files = readdirSync(migrationsDir)
				.filter((f) => f.endsWith(".ts"))
				.sort();
		} catch {
			console.log("\n  ⚠️  마이그레이션 폴더를 읽을 수 없습니다.\n");
			await db.close();
			return;
		}

		if (files.length === 0) {
			console.log("\n  📋 마이그레이션 파일이 없습니다.\n");
			await db.close();
			return;
		}

		// 상태 테이블 출력
		console.log("\n📋 마이그레이션 상태\n");
		console.log(`  ${"상태".padEnd(4)} ${"배치".padEnd(6)} ${"실행일시".padEnd(22)} 마이그레이션`);
		console.log(
			`  ${"──".padEnd(4)} ${"───".padEnd(6)} ${"──────────".padEnd(22)} ${"──────────"}`,
		);

		let appliedCount = 0;
		let pendingCount = 0;

		for (const file of files) {
			const info = ranMap.get(file);
			if (info) {
				console.log(
					`  ✅   ${String(info.batch).padEnd(6)} ${info.ranAt?.padEnd(22) ?? "".padEnd(22)} ${file}`,
				);
				appliedCount++;
			} else {
				console.log(`  ⏳   ${"—".padEnd(6)} ${"—".padEnd(22)} ${file}`);
				pendingCount++;
			}
		}

		console.log("");
		console.log(`  적용: ${appliedCount}개 | 미적용: ${pendingCount}개 | 전체: ${files.length}개`);

		if (pendingCount > 0) {
			console.log("\n  💡 실행: bun run igniter migrate");
		}

		console.log("");
		await db.close();
	},
};
