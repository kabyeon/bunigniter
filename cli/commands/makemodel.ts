// ============================================================
// make:model - 모델 생성
// bun run igniter make:model user
// bun run igniter make:model user --fields=name:string,email:string,age:number
// ============================================================

import type { Command } from "../registry.ts";
import {
	toPascalCase,
	toSnakeCase,
	toPlural,
	createFile,
	parseArgs,
} from "../utils.ts";

function parseFields(fieldsStr?: string): { name: string; type: string }[] {
	if (!fieldsStr) return [];
	return fieldsStr.split(",").map((f) => {
		const [name, type] = f.split(":");
		return { name: name.trim(), type: (type ?? "string").trim() };
	});
}

function tsType(sqlType: string): string {
	const map: Record<string, string> = {
		string: "string",
		text: "string",
		integer: "number",
		int: "number",
		number: "number",
		float: "number",
		double: "number",
		boolean: "boolean",
		bool: "boolean",
		date: "Date",
		datetime: "Date",
		timestamp: "Date",
		blob: "Buffer",
	};
	return map[sqlType.toLowerCase()] ?? "string";
}

function generateModel(
	name: string,
	fields: { name: string; type: string }[],
): string {
	const pascal = toPascalCase(name);
	const snake = toSnakeCase(name);
	const table = toPlural(snake);

	const interfaceFields =
		fields.length > 0
			? fields.map((f) => `  ${f.name}?: ${tsType(f.type)};`).join("\n")
			: `  id?: number;\n  // 필드를 추가하세요`;

	const fieldNames = fields.length > 0 ? fields.map((f) => f.name) : [];

	const createFields =
		fields.length > 0
			? fields.map((f) => `    ${f.name}: data.${f.name},`).join("\n")
			: `    // 필드를 매핑하세요`;

	return `import { Model } from "system/core/model.ts";

export interface ${pascal}Interface {
${interfaceFields}
}

export class ${pascal}Model extends Model<${pascal}Interface> {
  override tableName = "${table}";

  override async findAll(): Promise<${pascal}Interface[]> {
    return super.findAll();
  }

  override async findById(id: number): Promise<${pascal}Interface | null> {
    return super.findById(id);
  }

  override async create(data: Partial<${pascal}Interface>): Promise<${pascal}Interface> {
    return super.create(data);
  }

  override async update(id: number, data: Partial<${pascal}Interface>): Promise<${pascal}Interface | null> {
    return super.update(id, data);
  }

  override async delete(id: number): Promise<boolean> {
    return super.delete(id);
  }
}

export default new ${pascal}Model();
`;
}

export const makeModel: Command = {
	name: "make:model",
	description: "새 모델 생성",
	usage: "bun run igniter make:model <name> [--fields=name:type,...]",
	options: [
		{
			flag: "--fields",
			description:
				"필드 정의 (예: --fields=name:string,email:string,age:number)",
		},
	],
	async run(args: string[]): Promise<void> {
		const { positional, flags } = parseArgs(args);
		const name = positional[0];

		if (!name) {
			console.log("❌ 모델 이름을 입력하세요.");
			console.log("   예: bun run igniter make:model user");
			return;
		}

		const fields = parseFields(flags["fields"] as string | undefined);
		const snake = toSnakeCase(name);
		const fileName = `${snake}_model.ts`;

		console.log(`\n🔨 모델 생성: ${toPascalCase(name)}Model\n`);

		const content = generateModel(name, fields);
		createFile(`app/models/${fileName}`, content);

		console.log(`\n✨ 완료! app/models/${fileName}\n`);
	},
};
