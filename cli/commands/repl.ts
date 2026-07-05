// ============================================================
// BunIgniter - CLI REPL 명령어
// AdonisJS Ace REPL 스타일 인터랙티브 셸
// Bun 내장 REPL + 프레임워크 컨텍스트 주입
// ============================================================

import type { Command } from "../registry.ts";
import * as repl from "node:repl";
import { inspect } from "node:util";
import path from "node:path";
import { readdirSync } from "node:fs";

// ─── REPL 커스텀 메서드 타입 ────────────────────────────

interface ReplMethod {
	name: string;
	description: string;
	usage: string;
	handler: (replCtx: ReplContext, ...args: any[]) => any;
}

// ─── REPL 컨텍스트 ────────────────────────────────────

class ReplContext {
	private methods: Map<string, ReplMethod> = new Map();
	private longestMethodName = 0;

	constructor() {
		this.registerBuiltinMethods();
	}

	/** 커스텀 메서드 등록 */
	addMethod(
		name: string,
		description: string,
		usage: string,
		handler: (ctx: ReplContext, ...args: any[]) => any,
	): void {
		const width = usage.length;
		if (width > this.longestMethodName) this.longestMethodName = width;
		this.methods.set(name, { name, description, usage, handler });
	}

	/** 등록된 메서드 목록 */
	getMethods(): ReplMethod[] {
		return [...this.methods.values()];
	}

	/** 도움말 출력 */
	printHelp(): void {
		console.log("\n\x1b[32mGLOBAL METHODS:\x1b[0m");
		for (const method of this.methods.values()) {
			const usage = `\x1b[33m${method.usage}\x1b[0m`;
			const spaces = " ".repeat(
				Math.max(1, this.longestMethodName - method.usage.length + 2),
			);
			const desc = `\x1b[2m${method.description}\x1b[0m`;
			console.log(`  ${usage}${spaces}${desc}`);
		}
		console.log("");
	}

	/** 컨텍스트 프로퍼티 출력 */
	printContext(server: repl.REPLServer): void {
		console.log("\n\x1b[32mCONTEXT PROPERTIES:\x1b[0m");
		const skip = new Set([
			"clear",
			"p",
			"ls",
			"help",
			"load",
			"models",
			"config",
			"db",
			"routes",
			"env",
			"app",
		]);
		const context: Record<string, any> = {};
		for (const key of Object.keys(server.context)) {
			if (!skip.has(key) && typeof server.context[key] !== "function") {
				context[key] = server.context[key];
			}
		}
		console.log(inspect(context, false, 1, true));
	}

	/** 내장 메서드 등록 */
	private registerBuiltinMethods(): void {
		this.addMethod(
			"clear",
			"Clear a property from the REPL context",
			"clear <propertyName>",
			(_ctx: ReplContext, key: string, server: repl.REPLServer) => {
				if (!key) {
					console.log("\x1b[31mDefine a property name to remove\x1b[0m");
					return;
				}
				delete server.context[key];
				console.log(`Cleared: ${key}`);
			},
		);

		this.addMethod(
			"p",
			"Promisify a callback function",
			"p <function>",
			(_ctx: ReplContext, fn: Function) => {
				const promisify =
					(f: Function) =>
					(...args: any[]) =>
						new Promise((resolve, reject) => {
							f(...args, (err: any, result: any) =>
								err ? reject(err) : resolve(result),
							);
						});
				return promisify(fn);
			},
		);
	}
}

// ─── REPL 명령어 ──────────────────────────────────────

export const replCommand: Command = {
	name: "repl",
	description: "Start an interactive REPL session with framework context",
	usage: "bun run igniter repl",
	options: [],
	async run(_args: string[]) {
		console.log("");
		console.log(
			"\x1b[33m\x1b[3m🔥 BunIgniter REPL - Type .ls to view available methods\x1b[0m",
		);
		console.log("\x1b[2m  Type .exit or press Ctrl+C twice to exit\x1b[0m");
		console.log("");

		const ctx = new ReplContext();

		// 프레임워크 모듈 지연 로드
		let frameworkModules: Record<string, any> = {};

		try {
			const core = await import("../../system/core/index.ts");
			frameworkModules = {
				Controller: core.Controller,
				Model: core.Model,
				Router: core.Router,
				Validator: core.Validator,
				validate: core.validate,
				Auth: core.Auth,
				Cache: core.Cache,
				Queue: core.Queue,
				Scheduler: core.Scheduler,
				Email: core.Email,
				Logger: core.Logger,
				Upload: core.Upload,
				AuditLog: core.AuditLog,
				DistributedLock: core.DistributedLock,
				Crypto: core.Crypto,
				SSEManager: core.SSEManager,
				WebSocketManager: core.WebSocketManager,
				CryptoHasher: Bun.CryptoHasher,
				getCookie: core.getCookie,
				setCookie: core.setCookie,
				paginationHtml: core.paginationHtml,
				generateCsrfToken: core.generateCsrfToken,
				verifyCsrfToken: core.verifyCsrfToken,
			};
		} catch (err: any) {
			console.log(
				`\x1b[33m⚠ Framework modules not loaded: ${err.message}\x1b[0m`,
			);
		}

		// 설정 로드
		let appConfig: Record<string, any> = {};
		try {
			appConfig = (await import("../../app/config/app.ts")).default ?? {};
		} catch (err: any) {
			console.log(`\x1b[33m⚠ Config not loaded: ${err.message}\x1b[0m`);
		}
		let db: any = null;
		try {
			db = (await import("../../system/core/database.ts")).getDB;
		} catch (err: any) {
			console.log(`\x1b[33m⚠ Database not available: ${err.message}\x1b[0m`);
		}
		const env: Record<string, string | undefined> = {};
		for (const [key, value] of Object.entries(process.env)) {
			if (value !== undefined) env[key] = value;
		}

		// REPL 서버 시작
		const server = repl.start({
			prompt: "\x1b[36m> \x1b[0m",
			useColors: true,
			useGlobal: true,
		});

		// 프레임워크 컨텍스트 주입
		Object.assign(server.context, frameworkModules);

		// 커스텀 컨텍스트
		server.context.config = appConfig;
		server.context.env = env;
		server.context.app = {
			name: "BunIgniter",
			version: "1.0.0",
			runtime: `Bun ${Bun.version}`,
			platform: process.platform,
			pid: process.pid,
		};

		// DB 컨텍스트 (지연)
		if (db) {
			server.context.db = db;
			ctx.addMethod("db", "Get database connection", "db", () => db);
		}

		// 커스텀 .ls 명령어
		server.defineCommand("ls", {
			help: "View list of available context methods/properties",
			action() {
				ctx.printHelp();
				ctx.printContext(server);
				this.displayPrompt();
			},
		});

		// 커스텀 .models 명령어
		server.defineCommand("models", {
			help: "List available models",
			action() {
				console.log("\n\x1b[32mAVAILABLE MODELS:\x1b[0m");
				try {
					const modelDir = path.resolve(process.cwd(), "app/models");
					const files = readdirSync(modelDir);
					for (const file of files) {
						if (file.endsWith(".ts")) {
							console.log(`  \x1b[33m${file.replace(".ts", "")}\x1b[0m`);
						}
					}
				} catch {
					console.log("  \x1b[2mNo models found\x1b[0m");
				}
				this.displayPrompt();
			},
		});

		// 커스텀 .routes 명령어
		server.defineCommand("routes", {
			help: "List registered routes",
			action() {
				console.log("\n\x1b[32mROUTES:\x1b[0m");
				try {
					// Router가 설정되어 있으면 라우트 목록 출력
					const router = server.context.Router;
					if (router && router.getRoutes) {
						const routes = router.getRoutes();
						for (const route of routes) {
							console.log(`  \x1b[36m${route.method}\x1b[0m ${route.path}`);
						}
					} else {
						console.log(
							"  \x1b[2mRun server first or load routes config\x1b[0m",
						);
					}
				} catch (err: any) {
					console.log(`  \x1b[31m${err.message}\x1b[0m`);
				}
				this.displayPrompt();
			},
		});

		// 커스텀 .config 명령어
		server.defineCommand("config", {
			help: "Show application configuration",
			action() {
				console.log("\n\x1b[32mAPPLICATION CONFIG:\x1b[0m");
				console.log(inspect(server.context.config, false, 3, true));
				this.displayPrompt();
			},
		});

		// 커스텀 .load 명령어
		server.defineCommand("load", {
			help: "Load a module into the REPL context (e.g. .load ./app/models/user_model)",
			action(modulePath: string) {
				if (!modulePath?.trim()) {
					console.log("\x1b[31mUsage: .load <module-path>\x1b[0m");
					this.displayPrompt();
					return;
				}

				const resolvedPath = modulePath.trim().startsWith(".")
					? path.resolve(process.cwd(), modulePath.trim())
					: modulePath.trim();

				import(resolvedPath)
					.then((mod) => {
						const name = path.basename(resolvedPath, ".ts");
						server.context[name] = mod.default ?? mod;
						console.log(`\x1b[32mLoaded: ${name}\x1b[0m`);
						this.displayPrompt();
					})
					.catch((err: any) => {
						console.log(`\x1b[31mFailed to load: ${err.message}\x1b[0m`);
						this.displayPrompt();
					});
			},
		});

		// 커스텀 .help 명령어 덮어쓰기
		server.defineCommand("help", {
			help: "Show REPL help",
			action() {
				console.log("\n\x1b[32mBUNIGNITER REPL COMMANDS:\x1b[0m");
				console.log(
					"  \x1b[33m.ls\x1b[0m       List context properties and methods",
				);
				console.log("  \x1b[33m.models\x1b[0m   List available models");
				console.log("  \x1b[33m.routes\x1b[0m   List registered routes");
				console.log(
					"  \x1b[33m.config\x1b[0m   Show application configuration",
				);
				console.log(
					"  \x1b[33m.load\x1b[0m    Load a module (.load ./path/to/module)",
				);
				console.log(
					"  \x1b[33m.clear\x1b[0m   Clear a context property (clear <name>)",
				);
				console.log("  \x1b[33m.exit\x1b[0m    Exit the REPL");
				console.log("\n\x1b[32mNODE REPL COMMANDS:\x1b[0m");
				console.log("  \x1b[33m.break\x1b[0m   Exit from multi-line input");
				console.log(
					"  \x1b[33m.editor\x1b[0m  Enter editor mode (ctrl+C to finish)",
				);
				console.log("  \x1b[33m.save\x1b[0m    Save REPL session to a file");
				console.log(
					"  \x1b[33m.load\x1b[0m    Load a JS file into the REPL session",
				);
				console.log("");
				this.displayPrompt();
			},
		});

		// 히스토리 파일 설정
		const historyPath = path.resolve(
			process.cwd(),
			"storage/logs/.repl_history",
		);
		try {
			const { mkdirSync } = await import("node:fs");
			mkdirSync(path.dirname(historyPath), { recursive: true });
			server.setupHistory(historyPath, (err) => {
				if (err)
					console.log(`\x1b[33m⚠ History file warning: ${err.message}\x1b[0m`);
			});
		} catch {}

		// 종료 처리
		server.on("exit", () => {
			console.log("\n\x1b[33m🔥 BunIgniter REPL closed. Goodbye!\x1b[0m");
		});
	},
};
