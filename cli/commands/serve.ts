// ============================================================
// serve - 개발 서버 실행
// bun run igniter serve [--port=3000] [--host=0.0.0.0]
// ============================================================

import type { Command } from "../registry.ts";
import { parseArgs } from "../utils.ts";

export const serve: Command = {
	name: "serve",
	description: "개발 서버 실행 (핫리로드)",
	usage: "bun run igniter serve [--port=3000] [--host=0.0.0.0]",
	options: [
		{
			flag: "--port",
			description: "포트 번호 (기본: 3000)",
		},
		{
			flag: "--host",
			description: "호스트 주소 (기본: 0.0.0.0)",
		},
	],
	async run(args: string[]): Promise<void> {
		const { flags } = parseArgs(args);
		const port = Number(flags["port"] ?? 3000);
		const host = String(flags["host"] ?? "0.0.0.0");

		console.log(`\n🚀 개발 서버 시작 중...`);
		console.log(`   Host: ${host}`);
		console.log(`   Port: ${port}\n`);

		// Bun.spawn으로 bun run dev 실행 (핫리로드)
		const proc = Bun.spawn(
			["bun", "run", "--hot", "system/core/bootstrap.ts"],
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					PORT: String(port),
					HOST: host,
				},
				stdout: "inherit",
				stderr: "inherit",
				onExit(_proc, exitCode) {
					console.log(`\n🔴 서버 종료 (exit code: ${exitCode})`);
				},
			},
		);

		console.log(`   PID: ${proc.pid}`);
		console.log(`   URL: http://localhost:${port}\n`);
		console.log(`   Ctrl+C로 종료\n`);

		// 프로세스 대기
		await proc.exited;
	},
};
