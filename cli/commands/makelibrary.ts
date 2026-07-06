// ============================================================
// make:library - 라이브러리 생성
// bun run igniter make:library email
// ============================================================

import type { Command } from "../registry.ts";
import { createFile, toPascalCase, toSnakeCase } from "../utils.ts";

function generateLibrary(name: string): string {
	const pascal = toPascalCase(name);
	const camel = pascal[0].toLowerCase() + pascal.slice(1);

	return `/**
 * ${pascal} 라이브러리
 * CodeIgniter3 의 application/libraries 와 동일
 * 사용법: import { ${camel}Library } from "app/libraries/${toSnakeCase(name)}_library.ts"
 */
export class ${pascal}Library {
  /**
   * 라이브러리 초기화
   */
  constructor() {
    // 초기화 로직
  }

  /**
   * 예시 메서드
   */
  doSomething(): string {
    return "${pascal}Library 동작 중";
  }
}

export const ${camel}Library = new ${pascal}Library();
export default ${camel}Library;
`;
}

export const makeLibrary: Command = {
	name: "make:library",
	description: "새 라이브러리 클래스 생성",
	usage: "bun run igniter make:library <name>",
	async run(args: string[]): Promise<void> {
		const name = args[0];

		if (!name) {
			console.log("❌ 라이브러리 이름을 입력하세요.");
			console.log("   예: bun run igniter make:library email");
			return;
		}

		const snake = toSnakeCase(name);
		const fileName = `${snake}_library.ts`;

		console.log(`\n🔨 라이브러리 생성: ${toPascalCase(name)}Library\n`);

		const content = generateLibrary(name);
		createFile(`app/libraries/${fileName}`, content);

		console.log(`\n✨ 완료! app/libraries/${fileName}\n`);
	},
};
