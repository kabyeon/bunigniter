// ============================================================
// BunIgniter - CLI init 명령어
// 새 프로젝트 스캐폴딩
// bun run bi init [프로젝트명]
// bunx bunigniter init [프로젝트명]
// bunx create-bunigniter@latest [프로젝트명]
// ============================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "../registry.ts";

// ─── 템플릿 ──────────────────────────────────────────

const TEMPLATES: Record<string, (name: string) => string> = {
	// ── package.json ──
	"package.json": (name: string) => `{
\t"name": "${name}",
\t"version": "1.0.0",
\t"type": "module",
\t"scripts": {
\t\t"dev": "bun run --hot node_modules/bunigniter/system/core/bootstrap.ts",
\t\t"start": "bun run node_modules/bunigniter/system/core/bootstrap.ts",
\t\t"bi": "bun run node_modules/bunigniter/cli/index.ts",
\t\t"migrate": "bun run database/migrate.ts"
\t},
\t"dependencies": {
\t\t"bunigniter": "^0.6"
\t},
\t"devDependencies": {
\t\t"@types/bun": "latest"
\t}
}`,

	// ── tsconfig.json ──
	"tsconfig.json": () => `{
\t"compilerOptions": {
\t\t"target": "ESNext",
\t\t"module": "ESNext",
\t\t"moduleResolution": "bundler",
\t\t"types": ["bun-types"],
\t\t"strict": true,
\t\t"esModuleInterop": true,
\t\t"skipLibCheck": true,
\t\t"forceConsistentCasingInFileNames": true,
\t\t"resolveJsonModule": true,
\t\t"allowImportingTsExtensions": true,
\t\t"noEmit": true,
\t\t"baseUrl": ".",
\t\t"paths": {
\t\t\t"system/*": ["node_modules/bunigniter/system/*"],
\t\t\t"app/*": ["app/*"]
\t\t}
\t},
\t"include": ["app/**/*.ts", "database/**/*.ts"],
\t"exclude": ["node_modules"]
}`,

	// ── .env ──
	".env": () => `# BunIgniter Environment
APP_NAME=BunIgniter
BASE_URL=http://localhost:3000
APP_DEBUG=true
NODE_ENV=development
PORT=3000
`,

	// ── .gitignore ──
	".gitignore": () => `node_modules/
dist/
database/*.db
.env
.pi-lens/
storage/logs/*.log
storage/logs/.repl_history
storage/sessions/sess_*
storage/cache/*
!storage/cache/.gitkeep
public/uploads/*
!public/uploads/.gitkeep
`,

	// ── app/config/app.ts ──
	"app/config/app.ts": () => `// ============================================================
// BunIgniter - 앱 설정
// ============================================================

import type { AppConfig } from "system/core/config_types.ts";

const config: AppConfig = {
\tbaseUrl: process.env.BASE_URL ?? "http://localhost:3000",
\tappName: process.env.APP_NAME ?? "BunIgniter",
\tenv: process.env.NODE_ENV ?? "development",
\tdefaultController: "welcome",
\tdefaultMethod: "index",
\ttimezone: "Asia/Seoul",
\tlocale: "ko",
\tdebug: (process.env.APP_DEBUG ?? "true") === "true",
\tsession: {
\t\tcookieName: "bunigniter_session",
\t\texpiration: 7200,
\t\tdriver: "file",
\t\tpath: "./storage/sessions",
\t},
\tcsrf: {
\t\tenabled: false,
\t\ttokenName: "csrf_token",
\t\tcookieName: "csrf_cookie",
\t},
};

export default config;
`,

	// ── app/config/database.ts ──
	"app/config/database.ts": () => `// ============================================================
// BunIgniter - 데이터베이스 설정
// ============================================================

import type { DatabaseConfig } from "system/core/config_types.ts";

const config: DatabaseConfig = {
\tdefaultGroup: "default",
\tgroups: {
\t\tdefault: {
\t\t\tadapter: "sqlite",
\t\t\tfilename: "./database/${"PROJECT_NAME"}.db",
\t\t\tcreate: true,
\t\t},
\t},
};

export default config;
`,

	// ── app/config/routes.ts ──
	"app/config/routes.ts": () => `// ============================================================
// BunIgniter - 라우트 설정
// ============================================================

import welcomeController from "app/controllers/welcome_controller.ts";
import { Router } from "system/core/router.ts";

const router = new Router();

// ─── 기본 라우트 ───────────────────────────────────
router.get("/", welcomeController, "index");

// ─── 오토 라우트 (CI3 호환) ──────────────────────
router.autoRoute();

export default router;
`,

	// ── app/config/autoload.ts ──
	"app/config/autoload.ts": () => `// ============================================================
// BunIgniter - 오토로드 설정
// ============================================================

export default {
\thelpers: [],
\tlibraries: [],
\tmodels: [],
};
`,

	// ── app/controllers/welcome_controller.ts ──
	"app/controllers/welcome_controller.ts":
		() => `// ============================================================
// BunIgniter - Welcome 컨트롤러
// ============================================================

import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";

export class WelcomeController extends Controller {
\tasync index(_ctx: Context) {
\t\treturn this.view("welcome/index", { title: "BunIgniter에 오신 것을 환영합니다!" });
\t}
}

export default new WelcomeController();
`,

	// ── app/views/welcome/index.html ──
	"app/views/welcome/index.html": () => `<!-- layout:default -->

<!-- slot:title -->Welcome<!-- endslot -->

<h1>{{ title }}</h1>
<p>BunIgniter가 성공적으로 설치되었습니다! 🎉</p>
<p>CodeIgniter 3 스타일의 Bun 풀스택 MVC 프레임워크</p>

<ul>
\t<li>📖 <a href="https://github.com/kabyeon/bunigniter">문서</a></li>
\t<li>⚡ <strong>Bun.serve</strong> 네이티브 라우팅</li>
\t<li>🗄️ <strong>Bun SQL</strong> (SQLite/PostgreSQL/MySQL)</li>
\t<li>🎨 자체 템플릿 엔진</li>
</ul>
`,

	// ── app/views/layout/default.html ──
	"app/views/layout/default.html": () => `<!DOCTYPE html>
<html lang="ko">
<head>
\t<meta charset="utf-8">
\t<meta name="viewport" content="width=device-width, initial-scale=1">
\t<title>{{{ slot:title || "BunIgniter" }}}</title>
\t<link rel="stylesheet" href="/css/style.css">
</head>
<body>
\t<? include('partials/nav') ?>
\t<main class="container">
\t\t{{{ content }}}
\t</main>
\t<? include('partials/footer') ?>
</body>
</html>
`,

	// ── app/views/partials/nav.html ──
	"app/views/partials/nav.html": () => `<nav>
\t<a href="/" class="brand">🔥 BunIgniter</a>
</nav>
`,

	// ── app/views/partials/footer.html ──
	"app/views/partials/footer.html": () => `<footer>
\t<p>&copy; {{ new Date().getFullYear() }} BunIgniter</p>
</footer>
`,

	// ── app/views/partials/head.html ──
	"app/views/partials/head.html": () => `<meta name="csrf-token" content="{{ csrf_token ?? '' }}">
`,

	// ── app/views/partials/alerts.html ──
	"app/views/partials/alerts.html":
		() => `<? if (typeof flash_success !== 'undefined' && flash_success) { ?>
<div class="alert alert-success">{{ flash_success }}</div>
<? } ?>
<? if (typeof flash_error !== 'undefined' && flash_error) { ?>
<div class="alert alert-error">{{ flash_error }}</div>
<? } ?>
`,

	// ── app/views/errors/404.html ──
	"app/views/errors/404.html": () => `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>404</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px">
\t<h1>404</h1>
\t<p>페이지를 찾을 수 없습니다.</p>
\t<a href="/">홈으로</a>
</body>
</html>
`,

	// ── app/views/errors/500.html ──
	"app/views/errors/500.html": () => `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>500</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px">
\t<h1>500</h1>
\t<p>서버 오류가 발생했습니다.</p>
\t<a href="/">홈으로</a>
</body>
</html>
`,

	// ── public/css/style.css ──
	"public/css/style.css": () => `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
nav { background: #f8f9fa; padding: 1rem 2rem; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; }
.brand { font-weight: bold; text-decoration: none; font-size: 1.2rem; color: #333; }
.container { max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
h1, h2, h3 { margin-bottom: 0.5rem; }
a { color: #0066cc; }
footer { margin-top: 3rem; padding: 1rem; text-align: center; border-top: 1px solid #dee2e6; color: #666; }
.alert { padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1rem; }
.alert-success { background: #d4edda; color: #155724; }
.alert-error { background: #f8d7da; color: #721c24; }
`,

	// ── database/migrate.ts ──
	"database/migrate.ts": () => `// ============================================================
// BunIgniter - 마이그레이션 실행기
// ============================================================

import { getDB, closeAllConnections } from "system/core/database.ts";
import { logger } from "system/core/logger.ts";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

async function migrate() {
\tconst sql = await getDB();

\t// 마이그레이션 추적 테이블
\tawait sql\`CREATE TABLE IF NOT EXISTS migrations (
\t\tid INTEGER PRIMARY KEY AUTOINCREMENT,
\t\tname TEXT NOT NULL UNIQUE,
\t\tbatch INTEGER NOT NULL DEFAULT 1,
\t\trun_at TEXT NOT NULL DEFAULT (datetime('now'))
\t)\`;

\tconst applied = await sql\`SELECT name FROM migrations ORDER BY id\`;
\tconst appliedNames = new Set(applied.map((r: any) => r.name));

\tconst migrateDir = join(process.cwd(), "database/migrations");
\tif (!existsSync(migrateDir)) {
\t\tconsole.log("📭 마이그레이션 파일이 없습니다.");
\t\tawait closeAllConnections();
\t\treturn;
\t}

\tconst files = readdirSync(migrateDir)
\t\t.filter((f) => f.endsWith(".ts"))
\t\t.sort();

\tlet count = 0;
\tfor (const file of files) {
\t\tif (appliedNames.has(file)) continue;
\t\tconsole.log(\`⬆️  마이그레이션: \${file}\`);
\t\tconst mod = await import(join(migrateDir, file));
\t\tawait mod.up(sql);
\t\tawait sql\`INSERT INTO migrations (name) VALUES (\${file})\`;
\t\tcount++;
\t}

\tif (count === 0) {
\t\tconsole.log("✅ 모든 마이그레이션이 이미 적용되었습니다.");
\t} else {
\t\tconsole.log(\`✅ \${count}개 마이그레이션 완료.\`);
\t}

\tawait closeAllConnections();
}

migrate().catch((err) => {
\tconsole.error("❌ 마이그레이션 실패:", err);
\tprocess.exit(1);
});
`,
};

// ─── Merge 헬퍼 ──────────────────────────────────────

/** BunIgniter가 요구하는 package.json scripts */
const REQUIRED_PKG_SCRIPTS: Record<string, string> = {
	dev: "bun run --hot node_modules/bunigniter/system/core/bootstrap.ts",
	start: "bun run node_modules/bunigniter/system/core/bootstrap.ts",
	bi: "bun run node_modules/bunigniter/cli/index.ts",
	migrate: "bun run database/migrate.ts",
};

const REQUIRED_PKG_DEPENDENCIES: Record<string, string> = {
	bunigniter: "^0.6",
};

const REQUIRED_PKG_DEV_DEPENDENCIES: Record<string, string> = {
	"@types/bun": "latest",
};

/** BunIgniter가 요구하는 tsconfig compilerOptions */
const REQUIRED_TSCONFIG_COMPILER_OPTIONS: Record<string, any> = {
	moduleResolution: "bundler",
	types: ["bun-types"],
	allowImportingTsExtensions: true,
	noEmit: true,
	baseUrl: ".",
	paths: {
		"system/*": ["node_modules/bunigniter/system/*"],
		"app/*": ["app/*"],
	},
};

const REQUIRED_TSCONFIG_INCLUDE = ["app/**/*.ts", "database/**/*.ts"];

/** package.json merge */
function mergePackageJson(existing: Record<string, any>, projectName: string): Record<string, any> {
	const merged = { ...existing };

	// name이 없으면 설정
	if (!merged.name) merged.name = projectName;
	// type이 없으면 module
	if (!merged.type) merged.type = "module";
	if (!merged.version) merged.version = "1.0.0";

	// scripts merge
	merged.scripts = { ...merged.scripts, ...REQUIRED_PKG_SCRIPTS };

	// dependencies merge
	merged.dependencies = { ...merged.dependencies, ...REQUIRED_PKG_DEPENDENCIES };

	// devDependencies merge
	merged.devDependencies = { ...merged.devDependencies, ...REQUIRED_PKG_DEV_DEPENDENCIES };

	return merged;
}

/** tsconfig.json merge */
function mergeTsconfigJson(existing: Record<string, any>): Record<string, any> {
	const merged = { ...existing };

	merged.compilerOptions = { ...merged.compilerOptions, ...REQUIRED_TSCONFIG_COMPILER_OPTIONS };

	// paths는 덮어쓰지 않고 추가
	if (existing.compilerOptions?.paths) {
		merged.compilerOptions.paths = {
			...existing.compilerOptions.paths,
			...REQUIRED_TSCONFIG_COMPILER_OPTIONS.paths,
		};
	}

	// include merge (기존 + 필요 항목, 중복 제거)
	const existingInclude: string[] = merged.include ?? [];
	merged.include = [...new Set([...existingInclude, ...REQUIRED_TSCONFIG_INCLUDE])];

	// exclude에 node_modules가 없으면 추가
	const existingExclude: string[] = merged.exclude ?? [];
	if (!existingExclude.includes("node_modules")) {
		merged.exclude = [...existingExclude, "node_modules"];
	}

	return merged;
}

/** JSON5/주석 포함 JSON 문자열에서 주석 제거 후 파싱 */
function parseJsonWithComments(content: string): Record<string, any> {
	// 한 줄 주석 제거 (문자열 내부는 제외)
	const lines = content.split("\n");
	const cleaned: string[] = [];
	for (const line of lines) {
		let inString = false;
		let stringChar = "";
		let result = "";
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (inString) {
				result += ch;
				if (ch === stringChar && line[i - 1] !== "\\") {
					inString = false;
				}
				continue;
			}
			if (ch === '"' || ch === "'") {
				inString = true;
				stringChar = ch;
				result += ch;
				continue;
			}
			if (ch === "/" && line[i + 1] === "/") {
				break; // 라인 나머지 스킵
			}
			result += ch;
		}
		cleaned.push(result);
	}
	return JSON.parse(cleaned.join("\n"));
}

/** Merge 가능한 파일 목록 */
const MERGEABLE_FILES: Record<string, (existing: Record<string, any>, projectName: string) => Record<string, any>> = {
	"package.json": mergePackageJson,
	"tsconfig.json": (existing: Record<string, any>, _name: string) => mergeTsconfigJson(existing),
};

// ─── 빈 디렉토리용 .gitkeep ──────────────────────────

const EMPTY_DIRS = [
	"app/models",
	"app/middleware",
	"app/helpers",
	"app/libraries",
	"database/migrations",
	"database/seeds",
	"storage/logs",
	"storage/sessions",
	"storage/cache",
	"public/uploads",
	"public/js",
];

// ─── init 명령어 ──────────────────────────────────────

export const initCommand: Command = {
	name: "init",
	description: "새 BunIgniter 프로젝트 생성",
	usage: "bun run bi init [프로젝트명]",
	options: [{ flag: "--force", description: "기존 파일 덮어쓰기" }],
	async run(args: string[]) {
		const force = args.includes("--force");
		const projectName = args.filter((a) => !a.startsWith("--"))[0] ?? "my-app";
		const targetDir = projectName === "." ? process.cwd() : join(process.cwd(), projectName);

		// 디렉토리 생성
		if (projectName !== "." && !existsSync(targetDir)) {
			mkdirSync(targetDir, { recursive: true });
		}

		console.log("");
		console.log("\x1b[33m\x1b[3m🔥 BunIgniter 프로젝트 생성\x1b[0m");
		console.log(`  📁 ${targetDir}`);
		console.log("");

		// 템플릿 파일 생성
		let created = 0;
		let skipped = 0;
		let mergedCount = 0;

		for (const [filePath, template] of Object.entries(TEMPLATES)) {
			const fullPath = join(targetDir, filePath);
			const dir = join(fullPath, "..");

			if (!force && existsSync(fullPath)) {
				// merge 가능한 파일이면 merge 수행
				const mergeFn = MERGEABLE_FILES[filePath];
				if (mergeFn) {
					try {
						const existingContent = readFileSync(fullPath, "utf-8");
						const existingJson = parseJsonWithComments(existingContent);
						const mergedJson = mergeFn(existingJson, projectName);
						writeFileSync(fullPath, JSON.stringify(mergedJson, null, 2) + "\n");
						console.log(`  \x1b[36m↗\x1b[0m  ${filePath} (merge)`);
						mergedCount++;
						continue;
					} catch (e) {
						console.log(`  \x1b[31m✗\x1b[0m  ${filePath} (merge 실패: ${(e as Error).message})`);
						skipped++;
						continue;
					}
				}
				console.log(`  \x1b[33m⏭\x1b[0m  ${filePath} (이미 존재)`);
				skipped++;
				continue;
			}

			mkdirSync(dir, { recursive: true });
			const content =
				typeof template === "function"
					? template(projectName).replaceAll(
							"PROJECT_NAME",
							projectName.replace(/[^a-zA-Z0-9_]/g, "_"),
						)
					: template;
			writeFileSync(fullPath, content);
			console.log(`  \x1b[32m✓\x1b[0m  ${filePath}`);
			created++;
		}

		// 빈 디렉토리에 .gitkeep 생성
		for (const dir of EMPTY_DIRS) {
			const dirPath = join(targetDir, dir);
			mkdirSync(dirPath, { recursive: true });
			const gitkeep = join(dirPath, ".gitkeep");
			if (!existsSync(gitkeep)) {
				writeFileSync(gitkeep, "");
			}
		}

		console.log("");
		console.log(
			`  \x1b[32m${created}개 파일 생성\x1b[0m${mergedCount > 0 ? `, \x1b[36m${mergedCount}개 merge\x1b[0m` : ""}${skipped > 0 ? `, \x1b[33m${skipped}개 스킵\x1b[0m` : ""}`,
		);
		console.log("");

		// 다음 안내
		console.log("\x1b[36m다음 단계:\x1b[0m");
		if (projectName !== ".") {
			console.log(`  cd ${projectName}`);
		}
		console.log("  bun install");
		console.log("  bun run dev");
		console.log("");
		console.log("  \x1b[2m또는 CLI 명령어:\x1b[0m");
		console.log("  bun run bi make:controller posts");
		console.log("  bun run bi make:scaffold post");
		console.log("  bun run bi list:routes");
		console.log("");
	},
};
