import { SQL } from "bun";

async function migrate() {
	const sql = new SQL({
		adapter: "sqlite",
		filename: "./database/blog.db",
		create: true,
	});

	console.log("📦 마이그레이션 실행 중...\n");

	// 001_create_tables
	console.log("  → 001_create_tables");
	const { up } = await import("./migrations/001_create_tables.ts");
	await up(sql);

	console.log("\n✅ 마이그레이션 완료");
	await sql.close();
}

migrate().catch(console.error);
