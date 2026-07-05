// ============================================================
// make:helper - 헬퍼 함수 생성
// bun run igniter make:helper string
// ============================================================

import type { Command } from "../registry.ts";
import { toPascalCase, toSnakeCase, createFile } from "../utils.ts";

function generateHelper(name: string): string {
	const pascal = toPascalCase(name);

	return `/**
 * ${pascal} 헬퍼
 * 사용법: import { ... } from "app/helpers/${toSnakeCase(name)}_helper.ts"
 */

/**
 * 예시 헬퍼 함수
 */
export function exampleHelper(value: string): string {
  return value.toUpperCase();
}
`;
}

export const makeHelper: Command = {
	name: "make:helper",
	description: "새 헬퍼 파일 생성",
	usage: "bun run igniter make:helper <name>",
	async run(args: string[]): Promise<void> {
		const name = args[0];

		if (!name) {
			console.log("❌ 헬퍼 이름을 입력하세요.");
			console.log("   예: bun run igniter make:helper string");
			return;
		}

		const snake = toSnakeCase(name);
		const fileName = `${snake}_helper.ts`;

		console.log(`\n🔨 헬퍼 생성: ${toPascalCase(name)}Helper\n`);

		const content = generateHelper(name);
		createFile(`app/helpers/${fileName}`, content);

		console.log(`\n✨ 완료! app/helpers/${fileName}\n`);
	},
};
