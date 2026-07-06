// ============================================================
// make:scaffold - MVC 스캐폴딩 전체 생성
// bun run bi make:scaffold post
// bun run bi make:scaffold post --fields=title:string,content:text
// bun run bi make:scaffold post --api --fields=title:string
// ============================================================

import type { Command } from "../registry.ts";
import { createFile, parseArgs, toPascalCase, toPlural, toSnakeCase } from "../utils.ts";

export const makeScaffold: Command = {
	name: "make:scaffold",
	description: "Controller + Model + Views + Migration 전체 생성",
	usage: "bun run bi make:scaffold <name> [--fields=name:type,...] [--api]",
	options: [
		{
			flag: "--fields",
			description: "필드 정의 (예: --fields=title:string,content:text)",
		},
		{
			flag: "--api",
			description: "뷰 없이 JSON API 컨트롤러 + 모델 + 마이그레이션만 생성",
		},
	],
	async run(args: string[]): Promise<void> {
		const { positional, flags } = parseArgs(args);
		const name = positional[0];

		if (!name) {
			console.log("❌ 리소스 이름을 입력하세요.");
			console.log("   예: bun run bi make:scaffold post");
			console.log("   예: bun run bi make:scaffold post --fields=title:string,content:text");
			console.log("   예: bun run bi make:scaffold post --api --fields=title:string");
			return;
		}

		const pascal = toPascalCase(name);
		const snake = toSnakeCase(name);
		const plural = toPlural(snake);
		const model = name.toLowerCase();
		const modelPlural = toPlural(model);

		const fieldsStr = flags.fields as string | undefined;
		const fields = fieldsStr
			? fieldsStr.split(",").map((f) => {
					const [n, t] = f.split(":");
					return { name: n.trim(), type: (t ?? "string").trim() };
				})
			: [{ name: "name", type: "string" }];

		const isApi = !!flags.api;

		console.log(`\n🔥 스캐폴딩 생성: ${pascal}${isApi ? " (API 모드)" : ""}\n`);
		console.log("─────────────────────────────────────");

		// TypeScript 타입 매핑
		const tsType = (t: string) => {
			const map: Record<string, string> = {
				string: "string",
				text: "string",
				integer: "number",
				int: "number",
				number: "number",
				float: "number",
				boolean: "boolean",
				date: "Date",
				datetime: "Date",
				timestamp: "Date",
			};
			return map[t.toLowerCase()] ?? "string";
		};

		// ─── 1. Model ────────────────────────────────────
		console.log(`\n📦 Model`);
		createFile(
			`app/models/${snake}_model.ts`,
			`import { Model } from "system/core/model.ts";

export interface ${pascal}Interface {
  id?: number;
${fields.map((f) => `  ${f.name}?: ${tsType(f.type)};`).join("\n")}
  created_at?: string;
  updated_at?: string;
}

export class ${pascal}Model extends Model<${pascal}Interface> {
  override tableName = "${plural}";
}

export default new ${pascal}Model();
`,
		);

		// ─── 2. Controller ───────────────────────────────
		console.log(`\n🎮 Controller`);

		if (isApi) {
			createFile(
				`app/controllers/${snake}_controller.ts`,
				`import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import ${model}Model from "app/models/${snake}_model.ts";

export class ${pascal}Controller extends Controller {
  // GET /${plural}
  async index(_ctx: Context) {
    const ${modelPlural} = await ${model}Model.findAll();
    return this.json(${modelPlural});
  }

  // GET /${plural}/:id
  async show({ params, response }: Context) {
    const ${model} = await ${model}Model.findById(Number(params.id));
    if (!${model}) return this.json({ error: "Not Found" }, 404);
    return this.json(${model});
  }

  // POST /${plural}
  async store({ body, response }: Context) {
    const data = body();
    const ${model} = await ${model}Model.create(data);
    return this.json(${model}, 201);
  }

  // PUT /${plural}/:id
  async update({ body, params, response }: Context) {
    const data = body();
    const ${model} = await ${model}Model.update(Number(params.id), data);
    if (!${model}) return this.json({ error: "Not Found" }, 404);
    return this.json(${model});
  }

  // DELETE /${plural}/:id
  async delete({ params, response }: Context) {
    const ok = await ${model}Model.delete(Number(params.id));
    if (!ok) return this.json({ error: "Not Found" }, 404);
    return this.json({ success: true });
  }
}

export default new ${pascal}Controller();
`,
			);
		} else {
			createFile(
				`app/controllers/${snake}_controller.ts`,
				`import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import ${model}Model from "app/models/${snake}_model.ts";

export class ${pascal}Controller extends Controller {
  // GET /${plural}
  async index(_ctx: Context) {
    const ${modelPlural} = await ${model}Model.findAll();
    return this.view("${plural}/index", { ${modelPlural} });
  }

  // GET /${plural}/:id
  async show({ params, response }: Context) {
    const ${model} = await ${model}Model.findById(Number(params.id));
    if (!${model}) return response.status(404).send("Not Found");
    return this.view("${plural}/show", { ${model} });
  }

  // GET /${plural}/create
  async create(_ctx: Context) {
    return this.view("${plural}/create");
  }

  // POST /${plural}
  async store({ body, response }: Context) {
    const data = body();
    await ${model}Model.create(data);
    return response.redirect("/${plural}");
  }

  // GET /${plural}/:id/edit
  async edit({ params, response }: Context) {
    const ${model} = await ${model}Model.findById(Number(params.id));
    if (!${model}) return response.status(404).send("Not Found");
    return this.view("${plural}/edit", { ${model} });
  }

  // PUT /${plural}/:id
  async update({ body, params }: Context) {
    const data = body();
    await ${model}Model.update(Number(params.id), data);
    return new Response(null, { status: 302, headers: { Location: "/${plural}" } });
  }

  // DELETE /${plural}/:id
  async delete({ params }: Context) {
    await ${model}Model.delete(Number(params.id));
    return new Response(null, { status: 302, headers: { Location: "/${plural}" } });
  }
}

export default new ${pascal}Controller();
`,
			);
		}

		// ─── 3. Views (API 모드에서는 건너뜀) ──────────
		if (!isApi) {
			console.log(`\n🎨 Views`);

			createFile(
				`app/views/${plural}/index.html`,
				`<!-- layout:default -->
<!-- slot:title -->${pascal} 목록<!-- endslot -->

<h1>${pascal} 목록</h1>
<a href="/${plural}/create" class="btn btn-primary">새로 만들기</a>

<table class="table">
  <thead>
    <tr>
      <th>ID</th>
${fields.map((f) => `      <th>${toPascalCase(f.name)}</th>`).join("\n")}
      <th>작업</th>
    </tr>
  </thead>
  <tbody>
  <? for (const item of ${modelPlural}) { ?>
    <tr>
      <td>{{ item.id }}</td>
${fields.map((f) => `      <td>{{ item.${f.name} }}</td>`).join("\n")}
      <td>
        <a href="/${plural}/{{ item.id }}">보기</a> |
        <a href="/${plural}/{{ item.id }}/edit">수정</a> |
        <form method="POST" action="/${plural}/{{ item.id }}" style="display:inline">
          <input type="hidden" name="_method" value="DELETE" />
          <button type="submit" onclick="return confirm('삭제하시겠습니까?')">삭제</button>
        </form>
      </td>
    </tr>
  <? } ?>
  </tbody>
</table>
`,
			);

			createFile(
				`app/views/${plural}/show.html`,
				`<!-- layout:default -->
<!-- slot:title -->${pascal} 상세<!-- endslot -->

<h1>${pascal} 상세</h1>

<dl>
  <dt>ID</dt>
  <dd>{{ ${model}.id }}</dd>
${fields
	.map(
		(f) => `  <dt>${toPascalCase(f.name)}</dt>
  <dd>{{ ${model}.${f.name} }}</dd>`,
	)
	.join("\n")}
</dl>

<a href="/${plural}" class="btn">목록으로</a>
<a href="/${plural}/{{ ${model}.id }}/edit" class="btn">수정</a>
`,
			);

			createFile(
				`app/views/${plural}/create.html`,
				`<!-- layout:default -->
<!-- slot:title -->${pascal} 만들기<!-- endslot -->

<h1>${pascal} 만들기</h1>

<form method="POST" action="/${plural}">
  <input type="hidden" name="_csrf" value="{{ csrf_token ?? "" }}" />
${fields
	.map(
		(f) => `  <div class="form-group">
    <label>${toPascalCase(f.name)}</label>
    ${
			f.type === "text"
				? `<textarea name="${f.name}" required></textarea>`
				: `<input type="${f.type === "number" ? "number" : f.type === "boolean" ? "checkbox" : "text"}" name="${f.name}" required />`
		}
  </div>`,
	)
	.join("\n")}

  <button type="submit" class="btn btn-primary">저장</button>
  <a href="/${plural}" class="btn">취소</a>
</form>
`,
			);

			createFile(
				`app/views/${plural}/edit.html`,
				`<!-- layout:default -->
<!-- slot:title -->${pascal} 수정<!-- endslot -->

<h1>${pascal} 수정</h1>

<form method="POST" action="/${plural}/{{ ${model}.id }}">
  <input type="hidden" name="_method" value="PUT" />
  <input type="hidden" name="_csrf" value="{{ csrf_token ?? "" }}" />
${fields
	.map(
		(f) => `  <div class="form-group">
    <label>${toPascalCase(f.name)}</label>
    ${
			f.type === "text"
				? `<textarea name="${f.name}" required>{{ ${model}.${f.name} }}</textarea>`
				: `<input type="${f.type === "number" ? "number" : "text"}" name="${f.name}" value="{{ ${model}.${f.name} }}" required />`
		}
  </div>`,
	)
	.join("\n")}

  <button type="submit" class="btn btn-primary">수정</button>
  <a href="/${plural}" class="btn">취소</a>
</form>
`,
			);
		}

		// ─── 4. Migration ────────────────────────────────
		console.log(`\n📄 Migration`);
		const timestamp = Date.now();
		createFile(
			`database/migrations/${timestamp}_create_${plural}_table.ts`,
			`/**
 * 마이그레이션: create_${plural}_table
 * 생성일: ${new Date().toISOString().split("T")[0]}
 */
import { SQL } from "bun";

export async function up(sql: SQL): Promise<void> {
  await sql\`
    CREATE TABLE IF NOT EXISTS ${plural} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
${fields.map((f) => `      ${f.name} ${f.type.toUpperCase()}${f.name === "name" ? " NOT NULL" : ""},`).join("\n")}
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  \`;
}

export async function down(sql: SQL): Promise<void> {
  await sql\`
    DROP TABLE IF EXISTS ${plural}
  \`;
}
`,
		);

		// ─── 5. 라우트 자동 등록 ──────────────────────────────
		console.log(`\n🛤  Route`);
		const { appendRouteToFile } = await import("./routegen.ts");
		const added = appendRouteToFile(process.cwd(), { name, isApi });

		if (added) {
			console.log(`  ✅ routes.ts 에 ${isApi ? "API " : ""}라우트 자동 등록됨`);
		} else {
			console.log(`  ⚠️  routes.ts 에 수동으로 추가하세요:`);
			console.log(`    import ${snake}_controller from "app/controllers/${snake}_controller.ts";`);
			if (isApi) {
				console.log(`    router.group("/api", [], (apiRouter) => {`);
				console.log(`      apiRouter.resource("${plural}", ${snake}_controller);`);
				console.log(`    });`);
			} else {
				console.log(`    router.resource("${plural}", ${snake}_controller);`);
			}
		}

		// ─── 완료 안내 ──────────────────────────────────
		console.log("\n─────────────────────────────────────");
		console.log(`\n✨ ${pascal} 스캐폴딩 완료!\n`);
		console.log(`\n  📌 마이그레이션 실행:`);
		console.log(`    bun run bi migrate\n`);
	},
};
