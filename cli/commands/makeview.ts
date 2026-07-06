// ============================================================
// make:view - 뷰 템플릿 생성
// bun run igniter make:view posts/create
// bun run igniter make:view posts/index --resource
// ============================================================

import type { Command } from "../registry.ts";
import { createFile, parseArgs, toPascalCase, toPlural, toSnakeCase } from "../utils.ts";

function generateView(name: string, action: string): string {
	const pascal = toPascalCase(name);
	const snake = toSnakeCase(name);
	const plural = toPlural(snake);

	switch (action) {
		case "index":
			return `<!-- layout:default -->

<h1>${pascal} 목록</h1>
<a href="/${plural}/create" class="btn btn-primary">새로 만들기</a>

<table class="table">
  <thead>
    <tr>
      <th>ID</th>
      <th>이름</th>
      <th>작업</th>
    </tr>
  </thead>
  <tbody>
  <? for (const item of ${plural}) { ?>
    <tr>
      <td>{{ item.id }}</td>
      <td>{{ item.name }}</td>
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
`;

		case "show":
			return `<!-- layout:default -->

<h1>${pascal} 상세</h1>

<dl>
  <dt>ID</dt>
  <dd>{{ ${snake}.id }}</dd>
  <dt>이름</dt>
  <dd>{{ ${snake}.name }}</dd>
</dl>

<a href="/${plural}" class="btn">목록으로</a>
<a href="/${plural}/{{ ${snake}.id }}/edit" class="btn">수정</a>
`;

		case "create":
			return `<!-- layout:default -->

<h1>${pascal} 만들기</h1>

<form method="POST" action="/${plural}">
  <div class="form-group">
    <label>이름</label>
    <input type="text" name="name" required />
  </div>

  <button type="submit" class="btn btn-primary">저장</button>
  <a href="/${plural}" class="btn">취소</a>
</form>
`;

		case "edit":
			return `<!-- layout:default -->

<h1>${pascal} 수정</h1>

<form method="POST" action="/${plural}/{{ ${snake}.id }}">
  <input type="hidden" name="_method" value="PUT" />
  <div class="form-group">
    <label>이름</label>
    <input type="text" name="name" value="{{ ${snake}.name }}" required />
  </div>

  <button type="submit" class="btn btn-primary">수정</button>
  <a href="/${plural}" class="btn">취소</a>
</form>
`;

		default:
			return `<!-- layout:default -->

<h1>${pascal} - ${action}</h1>
<!-- 내용을 작성하세요 -->
`;
	}
}

export const makeView: Command = {
	name: "make:view",
	description: "새 뷰 템플릿 생성",
	usage: "bun run igniter make:view <dir/action> [--resource]",
	options: [
		{
			flag: "--resource",
			description: "CRUD 뷰 전체 생성 (index, show, create, edit)",
		},
	],
	async run(args: string[]): Promise<void> {
		const { positional, flags } = parseArgs(args);
		const name = positional[0];

		if (!name) {
			console.log("❌ 뷰 이름을 입력하세요.");
			console.log("   예: bun run igniter make:view posts/create");
			console.log("   예: bun run igniter make:view posts --resource");
			return;
		}

		const isResource = !!flags.resource;

		console.log(`\n🔨 뷰 생성\n`);

		if (isResource) {
			const dir = toSnakeCase(name);
			for (const action of ["index", "show", "create", "edit"]) {
				const content = generateView(name, action);
				createFile(`app/views/${dir}/${action}.html`, content);
			}
		} else {
			const parts = name.split("/");
			if (parts.length >= 2) {
				const dir = parts[0];
				const action = parts.slice(1).join("/");
				const content = generateView(parts[0], action);
				createFile(`app/views/${dir}/${action}.html`, content);
			} else {
				const dir = toSnakeCase(name);
				const content = generateView(name, "index");
				createFile(`app/views/${dir}/index.html`, content);
			}
		}

		console.log(`\n✨ 완료!\n`);
	},
};
