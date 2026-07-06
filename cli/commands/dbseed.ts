// ============================================================
// make:seed - 시드 파일 생성 + db:seed - 시드 실행
// bun run igniter make:seed user_seeder
// bun run igniter db:seed
// bun run igniter db:seed --files=user_seeder,post_seeder
// ============================================================

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SQL } from "bun";
import type { Command } from "../registry.ts";
import { createFile, parseArgs, toPascalCase, toSnakeCase } from "../utils.ts";

// ─── make:seed 명령어 ──────────────────────────────────

export const makeSeed: Command = {
	name: "make:seed",
	description: "시드 파일 생성",
	usage: "bun run igniter make:seed <name>",
	options: [],
	async run(args: string[]): Promise<void> {
		const { positional } = parseArgs(args);
		const name = positional[0];

		if (!name) {
			console.log("❌ 시더 이름을 입력하세요.");
			console.log("   예: bun run igniter make:seed user_seeder");
			return;
		}

		const snake = toSnakeCase(name);
		const pascal = toPascalCase(name.replace(/_seeder$/, ""));

		console.log(`\n🌱 시더 생성: ${snake}\n`);

		createFile(
			`database/seeds/${snake}.ts`,
			`/**
 * 시더: ${snake}
 * 생성일: ${new Date().toISOString().split("T")[0]}
 *
 * 실행: bun run igniter db:seed --files=${snake}
 */
import { SQL } from "bun";

export async function run(sql: SQL): Promise<void> {
  // TODO: 시드 데이터를 입력하세요
  // 예시:
  // await sql\`INSERT INTO ${pascal.toLowerCase()}s (name, email) VALUES (${"Alice"}, ${"alice@example.com"})\`;
  // await sql\`INSERT INTO ${pascal.toLowerCase()}s (name, email) VALUES (${"Bob"}, ${"bob@example.com"})\`;

  console.log("  🌱 ${snake} 실행 완료");
}
`,
		);

		console.log(`\n  📌 실행 방법:`);
		console.log(`    bun run igniter db:seed\n`);
	},
};

// ─── db:seed 명령어 ────────────────────────────────────

export const dbSeed: Command = {
	name: "db:seed",
	description: "데이터베이스 시드 실행",
	usage: "bun run igniter db:seed [--files=name1,name2]",
	options: [
		{
			flag: "--files",
			description: "실행할 시더 파일명 (쉼표 구분, 생략 시 전체 실행)",
		},
	],
	async run(args: string[]): Promise<void> {
		const { flags } = parseArgs(args);
		const filesStr = flags.files as string | undefined;
		const specificFiles = filesStr ? filesStr.split(",").map((f) => f.trim()) : null;

		console.log("\n🌱 시드 실행 중...\n");

		const db = new SQL({
			adapter: "sqlite",
			filename: "./database/bunigniter.db",
			create: true,
		});

		// 시드 디렉토리
		const seedsDir = join(process.cwd(), "database", "seeds");

		if (!existsSync(seedsDir)) {
			console.log("  ⚠️  database/seeds/ 폴더가 없습니다.");
			console.log("  💡 bun run igniter make:seed <name> 으로 시더를 생성하세요.\n");
			await db.close();
			return;
		}

		let files: string[] = [];
		try {
			files = readdirSync(seedsDir)
				.filter((f) => f.endsWith(".ts"))
				.sort();
		} catch {
			console.log("  ⚠️  시더 폴더를 읽을 수 없습니다.\n");
			await db.close();
			return;
		}

		if (files.length === 0) {
			console.log("  📋 실행할 시더가 없습니다.");
			console.log("  💡 bun run igniter make:seed <name> 으로 시더를 생성하세요.\n");
			await db.close();
			return;
		}

		// 특정 파일 필터링
		const targetFiles = specificFiles
			? files.filter((f) => {
					const baseName = f.replace(".ts", "");
					return specificFiles.some((sf) => sf === f || sf === baseName || f.startsWith(sf));
				})
			: files;

		if (targetFiles.length === 0) {
			console.log("  📋 지정한 시더 파일을 찾을 수 없습니다.\n");
			await db.close();
			return;
		}

		let count = 0;

		for (const file of targetFiles) {
			console.log(`  🌱 실행 중: ${file}`);

			try {
				const mod = await import(join(seedsDir, file));
				if (mod.run) {
					await mod.run(db);
					console.log(`  ✅ 완료: ${file}`);
					count++;
				} else {
					console.log(`  ⚠️  run() 함수 없음: ${file}`);
				}
			} catch (err: any) {
				console.log(`  ❌ 실패: ${file} - ${err.message}`);
			}
		}

		await db.close();

		console.log(`\n✨ ${count}개의 시더가 실행되었습니다.\n`);
	},
};
