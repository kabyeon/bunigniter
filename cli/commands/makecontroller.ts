// ============================================================
// make:controller - 컨트롤러 생성
// bun run igniter make:controller users
// bun run igniter make:controller users --resource
// bun run igniter make:controller users index show store update delete
// ============================================================

import type { Command } from "../registry.ts";
import {
	toPascalCase,
	toSnakeCase,
	toPlural,
	createFile,
	parseArgs,
} from "../utils.ts";

const RESOURCE_METHODS = `  // GET /{{route}}
  async index({ request, response }: Context) {
    const results = await {{model}}Model.findAll();
    return this.view("{{view_dir}}/index", { {{modelPlural}}: results });
  }

  // GET /{{route}}/:id
  async show({ request, params, response }: Context) {
    const {{model}} = await {{model}}Model.findById(Number(params.id));
    if (!{{model}}) return response.status(404).send("Not Found");
    return this.view("{{view_dir}}/show", { {{model}} });
  }

  // GET /{{route}}/create
  async create({ request, response }: Context) {
    return this.view("{{view_dir}}/create");
  }

  // POST /{{route}}
  async store({ request, response }: Context) {
    const data = request.body();
    const result = await {{model}}Model.create(data);
    return response.redirect("/{{route}}");
  }

  // GET /{{route}}/:id/edit
  async edit({ request, params, response }: Context) {
    const {{model}} = await {{model}}Model.findById(Number(params.id));
    if (!{{model}}) return response.status(404).send("Not Found");
    return this.view("{{view_dir}}/edit", { {{model}} });
  }

  // PUT /{{route}}/:id
  async update({ request, params, response }: Context) {
    const data = request.body();
    await {{model}}Model.update(Number(params.id), data);
    return response.redirect("/{{route}}");
  }

  // DELETE /{{route}}/:id
  async delete({ request, params, response }: Context) {
    await {{model}}Model.delete(Number(params.id));
    return response.redirect("/{{route}}");
  }`;

function generateController(
	name: string,
	methods: string[],
	isResource: boolean,
): string {
	const pascal = toPascalCase(name);
	const snake = toSnakeCase(name);
	const model = name.toLowerCase();
	const modelPlural = toPlural(model);
	const viewDir = toPlural(snake);
	const route = toPlural(snake);

	let methodsCode: string;

	if (isResource) {
		methodsCode = RESOURCE_METHODS.replace(/\{\{model\}\}/g, model)
			.replace(/\{\{modelPlural\}\}/g, modelPlural)
			.replace(/\{\{view_dir\}\}/g, viewDir)
			.replace(/\{\{route\}\}/g, route);
	} else if (methods.length > 0) {
		methodsCode = methods
			.map(
				(m) =>
					`  async ${m}({ request, response }: Context) {\n    // TODO: 구현하기\n  }`,
			)
			.join("\n\n");
	} else {
		methodsCode = `  async index({ request, response }: Context) {\n    // TODO: 구현하기\n  }`;
	}

	return `import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
${isResource ? `import { ${pascal}Model } from "app/models/${snake}_model.ts";` : ""}

export class ${pascal}Controller extends Controller {
${methodsCode}
}

export default new ${pascal}Controller();
`;
}

export const makeController: Command = {
	name: "make:controller",
	description: "새 컨트롤러 생성",
	usage: "bun run igniter make:controller <name> [methods...] [--resource]",
	options: [
		{
			flag: "--resource",
			description:
				"CRUD 메서드 자동 생성 (index, show, create, store, edit, update, delete)",
		},
	],
	async run(args: string[]): Promise<void> {
		const { positional, flags } = parseArgs(args);
		const name = positional[0];

		if (!name) {
			console.log("❌ 컨트롤러 이름을 입력하세요.");
			console.log("   예: bun run igniter make:controller users");
			return;
		}

		const isResource = !!flags["resource"];
		const methods = positional.slice(1);
		const snake = toSnakeCase(name);
		const fileName = `${snake}_controller.ts`;

		console.log(`\n🔨 컨트롤러 생성: ${toPascalCase(name)}Controller\n`);

		const content = generateController(name, methods, isResource);
		createFile(`app/controllers/${fileName}`, content);

		console.log(`\n✨ 완료! app/controllers/${fileName}\n`);
	},
};
