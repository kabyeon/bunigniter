// ============================================================
// make:migration - 마이그레이션 파일 생성
// bun run igniter make:migration create_users_table
// bun run igniter make:migration add_email_to_users --fields=email:string
// ============================================================

import type { Command } from "../registry.ts";
import { toSnakeCase, createFile, parseArgs } from "../utils.ts";

function generateMigration(
	name: string,
	fields: { name: string; type: string }[],
): string {
	const isCreate = name.startsWith("create_");
	const isAdd = name.startsWith("add_");
	const isDrop = name.startsWith("drop_");

	if (isCreate) {
		const tableName = name.replace(/^create_/, "").replace(/_table$/, "");

		const fieldDefs =
			fields.length > 0
				? fields
						.map((f) => `      ${f.name} ${f.type.toUpperCase()},`)
						.join("\n")
				: `      -- 컬럼을 정의하세요\n      name TEXT NOT NULL,`;

		return `/**
 * 마이그레이션: ${name}
 * 생성일: ${new Date().toISOString().split("T")[0]}
 */
import { SQL } from "bun";

export async function up(sql: SQL): Promise<void> {
  await sql\`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
${fieldDefs}
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  \`;
}

export async function down(sql: SQL): Promise<void> {
  await sql\`
    DROP TABLE IF EXISTS ${tableName}
  \`;
}
`;
	}

	if (isAdd) {
		const tableName = name.replace(/^add_/, "").replace(/_to_.*$/, "");

		const addCols =
			fields.length > 0
				? fields
						.map(
							(f) =>
								`  await sql\\\`ALTER TABLE ${tableName} ADD COLUMN ${f.name} ${f.type.toUpperCase()}\\\`;`,
						)
						.join("\n\n")
				: `  // ALTER TABLE 구문을 작성하세요`;

		return `/**
 * 마이그레이션: ${name}
 * 생성일: ${new Date().toISOString().split("T")[0]}
 */
import { SQL } from "bun";

export async function up(sql: SQL): Promise<void> {
${addCols}
}

export async function down(sql: SQL): Promise<void> {
  // ALTER TABLE ${tableName} DROP COLUMN ...
}
`;
	}

	return `/**
 * 마이그레이션: ${name}
 * 생성일: ${new Date().toISOString().split("T")[0]}
 */
import { SQL } from "bun";

export async function up(sql: SQL): Promise<void> {
  // UP 마이그레이션을 작성하세요
}

export async function down(sql: SQL): Promise<void> {
  // DOWN 마이그레이션을 작성하세요
}
`;
}

export const makeMigration: Command = {
	name: "make:migration",
	description: "새 마이그레이션 파일 생성",
	usage: "bun run igniter make:migration <name> [--fields=name:type,...]",
	options: [
		{
			flag: "--fields",
			description: "필드 정의 (예: --fields=name:string,email:string)",
		},
	],
	async run(args: string[]): Promise<void> {
		const { positional, flags } = parseArgs(args);
		const name = positional[0];

		if (!name) {
			console.log("❌ 마이그레이션 이름을 입력하세요.");
			console.log("   예: bun run igniter make:migration create_users_table");
			return;
		}

		const fieldsStr = flags["fields"] as string | undefined;
		const fields = fieldsStr
			? fieldsStr.split(",").map((f) => {
					const [name, type] = f.split(":");
					return { name: name.trim(), type: (type ?? "string").trim() };
				})
			: [];

		const timestamp = Date.now();
		const snake = toSnakeCase(name);
		const fileName = `${timestamp}_${snake}.ts`;

		console.log(`\n🔨 마이그레이션 생성: ${name}\n`);

		const content = generateMigration(name, fields);
		createFile(`database/migrations/${fileName}`, content);

		console.log(`\n✨ 완료! database/migrations/${fileName}\n`);
	},
};
