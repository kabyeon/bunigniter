// ============================================================
// BunIgniter - 데이터베이스 마이그레이션 실행기
// ============================================================

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { SQL } from "bun";

async function migrate() {
	console.log("\n📦 마이그레이션 실행 중...\n");

	const db = new SQL({
		adapter: "sqlite",
		filename: "./database/bunigniter.db",
		create: true,
	});

	// 마이그레이션 추적 테이블 생성
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

	// 이미 실행된 마이그레이션 조회
	const ran = await db`SELECT name FROM migrations`;
	const ranNames = new Set(ran.map((r: any) => r.name));

	// 마이그레이션 파일 목록
	const migrationsDir = join(import.meta.dir, "migrations");
	let files: string[] = [];

	try {
		files = readdirSync(migrationsDir)
			.filter((f) => f.endsWith(".ts"))
			.sort();
	} catch {
		console.log("  ⚠️  마이그레이션 폴더가 비어있습니다.");
		await db.close();
		return;
	}

	let count = 0;

	for (const file of files) {
		if (ranNames.has(file)) {
			console.log(`  ⏭️  이미 실행됨: ${file}`);
			continue;
		}

		console.log(`  ▶️  실행 중: ${file}`);

		try {
			const mod = await import(join(migrationsDir, file));
			if (mod.up) {
				await mod.up(db);
				await db`INSERT INTO migrations (name, batch) VALUES (${file}, ${nextBatch})`;
				console.log(`  ✅ 완료: ${file}`);
				count++;
			}
		} catch (err: any) {
			console.log(`  ❌ 실패: ${file} - ${err.message}`);
			break;
		}
	}

	await db.close();

	if (count > 0) {
		console.log(`\n✨ ${count}개의 마이그레이션이 실행되었습니다. (batch: ${nextBatch})\n`);
	} else {
		console.log("\n📋 실행할 새 마이그레이션이 없습니다.\n");
	}
}

migrate().catch((err) => {
	console.error("❌ 마이그레이션 실패:", err);
	process.exit(1);
});
