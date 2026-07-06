// ============================================================
// BunIgniter - CLI REPL 명령어
// Bun 네이티브 readline 기반 REPL
// list:routes 와 동일한 parseRoutesFromFile/printRoutes 사용
// ============================================================

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline";
import type { Command } from "../registry.ts";
import { parseRoutesFromFile, printRoutes } from "./route_list.ts";

// ─── 히스토리 ──────────────────────────────────────────

const HISTORY_FILE = join(process.cwd(), "storage/logs/.repl_history");
const MAX_HISTORY = 500;

function loadHistory(): string[] {
	try {
		if (existsSync(HISTORY_FILE)) {
			return readFileSync(HISTORY_FILE, "utf-8").split("\n").filter(Boolean).slice(-MAX_HISTORY);
		}
	} catch (_e) {
		/* ignore */
	}
	return [];
}

function saveHistory(entry: string): void {
	try {
		mkdirSync(join(process.cwd(), "storage/logs"), { recursive: true });
		const existing = loadHistory();
		existing.push(entry);
		writeFileSync(HISTORY_FILE, existing.slice(-MAX_HISTORY).join("\n"));
	} catch (_e) {
		/* ignore */
	}
}

// ─── 프레임워크 컨텍스트 ─────────────────────────────

async function loadFrameworkContext(): Promise<Record<string, any>> {
	const context: Record<string, any> = {};

	try {
		const core = await import("../../system/core/index.ts");
		context.Controller = core.Controller;
		context.Model = core.Model;
		context.Router = core.Router;
		context.Validator = core.Validator;
		context.validate = core.validate;
		context.Auth = core.Auth;
		context.Cache = core.Cache;
		context.Queue = core.Queue;
		context.Scheduler = core.Scheduler;
		context.Email = core.Email;
		context.Logger = core.Logger;
		context.Upload = core.Upload;
		context.AuditLog = core.AuditLog;
		context.DistributedLock = core.DistributedLock;
		context.Crypto = core.Crypto;
		context.SSEManager = core.SSEManager;
		context.WebSocketManager = core.WebSocketManager;
		context.CryptoHasher = Bun.CryptoHasher;
		context.getCookie = core.getCookie;
		context.setCookie = core.setCookie;
		context.paginationHtml = core.paginationHtml;
		context.generateCsrfToken = core.generateCsrfToken;
		context.verifyCsrfToken = core.verifyCsrfToken;
		context.UserAgent = (await import("../../system/core/user_agent.ts")).UserAgent;
		context.Profiler = (await import("../../system/core/profiler.ts")).Profiler;
		context.autoloadRegistry = (await import("../../system/core/autoload.ts")).autoloadRegistry;
		context.AutoRouter = (await import("../../system/core/auto_router.ts")).AutoRouter;
	} catch (err: any) {
		console.log(`\x1b[33m⚠ Framework modules: ${err.message}\x1b[0m`);
	}

	try {
		context.config = (await import("../../app/config/app.ts")).default ?? {};
	} catch (_e) {
		/* ignore */
	}

	try {
		context.db = (await import("../../system/core/database.ts")).getDB;
	} catch (_e) {
		/* ignore */
	}

	context.env = { ...process.env };
	context.app = {
		name: "BunIgniter",
		version: "1.0.0",
		runtime: `Bun ${Bun.version}`,
		platform: process.platform,
		pid: process.pid,
	};

	return context;
}

// ─── 닷 커맨드 ──────────────────────────────────────────

function handleDotCommand(cmd: string, ctx: Record<string, any>): void {
	switch (cmd.trim()) {
		case ".help": {
			console.log("");
			console.log("\x1b[32mBUNIGNITER REPL COMMANDS:\x1b[0m");
			console.log("  \x1b[33m.help\x1b[0m     Show this help message");
			console.log("  \x1b[33m.ls\x1b[0m      List context properties");
			console.log(
				"  \x1b[33m.routes\x1b[0m  List registered routes (same as `bun run bi list:routes`)",
			);
			console.log("  \x1b[33m.models\x1b[0m  List available models");
			console.log("  \x1b[33m.config\x1b[0m  Show application configuration");
			console.log("  \x1b[33m.clear\x1b[0m   Clear screen");
			console.log("  \x1b[33m.exit\x1b[0m    Exit the REPL");
			console.log("");
			console.log("\x1b[32mTIPS:\x1b[0m");
			console.log("  - Top-level \x1b[33mawait\x1b[0m is supported");
			console.log("  - Framework classes are auto-imported (Controller, Model, etc.)");
			console.log(
				"  - \x1b[33mdb\x1b[0m = database connection, \x1b[33mconfig\x1b[0m = app config",
			);
			console.log("");
			break;
		}

		case ".ls": {
			console.log("\n\x1b[32mCONTEXT:\x1b[0m");
			for (const [key, value] of Object.entries(ctx)) {
				const type =
					typeof value === "function"
						? value.name
							? `${value.name}()`
							: "function"
						: typeof value;
				console.log(`  \x1b[33m${key}\x1b[0m: ${type}`);
			}
			console.log("");
			break;
		}

		case ".routes": {
			console.log("");
			const routes = parseRoutesFromFile();
			printRoutes(routes);
			break;
		}

		case ".models": {
			console.log("\n\x1b[32mAVAILABLE MODELS:\x1b[0m");
			try {
				const modelDir = join(process.cwd(), "app/models");
				if (existsSync(modelDir)) {
					const files = readdirSync(modelDir);
					for (const file of files) {
						if (file.endsWith(".ts")) {
							const modelName = file.replace(".ts", "");
							console.log(`  \x1b[33m${modelName}\x1b[0m`);
						}
					}
				} else {
					console.log("  \x1b[2mNo models directory\x1b[0m");
				}
			} catch (_e) {
				console.log("  \x1b[2mNo models found\x1b[0m");
			}
			console.log("");
			break;
		}

		case ".config": {
			console.log("\n\x1b[32mAPPLICATION CONFIG:\x1b[0m");
			console.log(JSON.stringify(ctx.config, null, 2));
			console.log("");
			break;
		}

		case ".clear": {
			console.clear();
			break;
		}

		case ".exit": {
			console.log("\x1b[33m🔥 Goodbye!\x1b[0m");
			process.exit(0);
			break;
		}

		default: {
			console.log(
				`\x1b[31mUnknown command: ${cmd}\x1b[0m  Type \x1b[33m.help\x1b[0m for available commands.`,
			);
			break;
		}
	}
}

// ─── REPL 명령어 ──────────────────────────────────────

export const replCommand: Command = {
	name: "repl",
	description: "Start an interactive REPL session with framework context",
	usage: "bun run bi repl",
	options: [],
	async run(_args: string[]) {
		console.log("");
		console.log("\x1b[33m\x1b[3m🔥 BunIgniter REPL\x1b[0m");
		console.log("\x1b[2m  Type .help for commands, .exit to quit\x1b[0m");
		console.log("");

		const ctx = await loadFrameworkContext();
		const varNames = Object.keys(ctx);

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			history: loadHistory(),
			completer: (line: string) => {
				const commands = [".help", ".ls", ".routes", ".models", ".config", ".clear", ".exit"];
				const hits = [...varNames, ...commands].filter((c) => c.startsWith(line));
				return [hits.length ? hits : varNames, line];
			},
		});

		rl.setPrompt("\x1b[36m> \x1b[0m");
		rl.prompt();

		rl.on("line", async (line) => {
			const trimmed = line.trim();
			if (!trimmed) {
				rl.prompt();
				return;
			}

			saveHistory(trimmed);

			// 닷 커맨드
			if (trimmed.startsWith(".")) {
				handleDotCommand(trimmed, ctx);
				rl.prompt();
				return;
			}

			// 코드 평가
			try {
				const varDecls = varNames.map((k) => `const ${k} = __ctx__["${k}"];`).join("");
				const wrappedCode = `${varDecls}\n${trimmed}`;
				const fn = new Function("__ctx__", `return (async () => { ${wrappedCode} })()`);
				const result = await fn(ctx);
				if (result !== undefined) {
					console.log(result);
				}
			} catch (err: any) {
				console.log(`\x1b[31m${err.message}\x1b[0m`);
			}

			rl.prompt();
		});

		rl.on("close", () => {
			console.log("\n\x1b[33m🔥 BunIgniter REPL closed. Goodbye!\x1b[0m");
			process.exit(0);
		});
	},
};
