// ============================================================
// BunIgniter - Shell Helper
// Bun.spawn() / Bun.$ 내장 기능 활용
// CI3의 프로세스 실행 / 서드파티 라이브러리 대체
// ============================================================

// ─── 인터페이스 ──────────────────────────────────────

export interface ShellResult {
	/** 표준 출력 */
	stdout: string;
	/** 표준 에러 */
	stderr: string;
	/** 종료 코드 */
	exitCode: number;
	/** 성공 여부 */
	success: boolean;
}

export interface ShellOptions {
	/** 작업 디렉토리 */
	cwd?: string;
	/** 환경 변수 */
	env?: Record<string, string | undefined>;
	/** 타임아웃 (ms) */
	timeout?: number;
	/** 입력 데이터 */
	input?: string | Buffer | ReadableStream;
}

// ─── Shell 클래스 ──────────────────────────────────────

/**
 * 셸 명령어 실행 유틸리티
 * Bun.spawn() / Bun.$ 내장 사용
 *
 * 사용법:
 *   import { Shell } from "system/core/shell.ts";
 *
 *   // 명령어 실행
 *   const result = await Shell.run("git status --porcelain");
 *   console.log(result.stdout);
 *   console.log(result.exitCode);
 *
 *   // 템플릿 리터럴 (Bun.$)
 *   const output = await Shell.$`echo hello world`.text();
 *
 *   // 스크립트 실행
 *   await Shell.exec("./scripts/build.sh", ["--production"]);
 *
 *   // 백그라운드 프로세스
 *   const proc = Shell.spawn(["bun", "run", "worker.ts"]);
 *   // ... 나중에
 *   await proc.exited;
 */
export class Shell {
	// ─── 동기 실행 (Bun.spawnSync) ──────────────────────

	/**
	 * 명령어 실행 (동기)
	 * Bun.spawnSync() 내장 사용
	 * CLI 도구에 적합
	 */
	static runSync(command: string, options?: ShellOptions): ShellResult {
		const cmd = command.split(" ");
		const result = Bun.spawnSync({
			cmd,
			cwd: options?.cwd,
			env: options?.env ?? (process.env as any),
			timeout: options?.timeout,
		});

		return {
			stdout: result.stdout?.toString() ?? "",
			stderr: result.stderr?.toString() ?? "",
			exitCode: result.exitCode,
			success: result.success,
		};
	}

	// ─── 비동기 실행 (Bun.spawn) ────────────────────────

	/**
	 * 명령어 실행 (비동기)
	 * Bun.spawn() 내장 사용
	 * HTTP 서버/앱에 적합
	 */
	static async run(
		command: string,
		options?: ShellOptions,
	): Promise<ShellResult> {
		const cmd = command.split(" ");
		const spawnOptions: any = {
			cwd: options?.cwd,
			env: options?.env ?? (process.env as any),
			timeout: options?.timeout,
			stdout: "pipe" as const,
			stderr: "pipe" as const,
		};

		if (options?.input) {
			if (typeof options.input === "string") {
				spawnOptions.stdin = new Response(options.input);
			} else if (options.input instanceof Uint8Array) {
				spawnOptions.stdin = new Response(options.input as any);
			} else {
				spawnOptions.stdin = options.input;
			}
		}

		const proc = Bun.spawn(cmd, spawnOptions);
		const exitCode = await proc.exited;

		const stdout = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();

		return {
			stdout,
			stderr,
			exitCode,
			success: exitCode === 0,
		};
	}

	// ─── 배열 형태 명령어 실행 ──────────────────────────

	/**
	 * 명령어 배열로 실행 (안전한 인자 전달)
	 * Bun.spawn() 내장 사용
	 */
	static async exec(
		command: string,
		args: string[] = [],
		options?: ShellOptions,
	): Promise<ShellResult> {
		const cmd = [command, ...args];
		const proc = Bun.spawn(cmd, {
			cwd: options?.cwd,
			env: options?.env ?? (process.env as any),
			timeout: options?.timeout,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const stdout = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();

		return {
			stdout,
			stderr,
			exitCode,
			success: exitCode === 0,
		};
	}

	// ─── 백그라운드 프로세스 ────────────────────────────

	/**
	 * 백그라운드 프로세스 시작
	 * Bun.spawn() 내장 사용
	 * IPC 지원
	 */
	static spawn(
		command: string[],
		options?: ShellOptions & {
			/** IPC 메시지 핸들러 */
			onMessage?: (message: any, proc: any) => void;
			/** 종료 핸들러 */
			onExit?: (proc: any, exitCode: number, signalCode: number | null) => void;
		},
	): any {
		const spawnOptions: any = {
			cmd: command,
			cwd: options?.cwd,
			env: options?.env ?? (process.env as any),
			timeout: options?.timeout,
			stdout: "pipe",
			stderr: "pipe",
		};

		if (options?.onExit) {
			spawnOptions.onExit = options.onExit;
		}

		if (options?.onMessage) {
			spawnOptions.ipc = options.onMessage;
			spawnOptions.serialization = "json";
		}

		return Bun.spawn(command, spawnOptions);
	}

	// ─── Bun.$ 템플릿 리터럴 ────────────────────────────

	/**
	 * Bun.$ 셸 템플릿 리터럴 접근자
	 *
	 * 사용법:
	 *   const output = await Shell.$`echo hello`.text();
	 *   const { stdout } = await Shell.$`git status`;
	 */
	static get $(): any {
		try {
			const bunMod = require("bun") as any;
			return bunMod.$;
		} catch {
			throw new Error("Bun.$ is not available");
		}
	}

	// ─── 편의 메서드 ────────────────────────────────────

	/**
	 * 명령어 실행 후 표준 출력만 반환
	 */
	static async output(
		command: string,
		options?: ShellOptions,
	): Promise<string> {
		const result = await Shell.run(command, options);
		return result.stdout.trim();
	}

	/**
	 * 명령어 실행 후 성공 여부만 반환
	 */
	static async success(
		command: string,
		options?: ShellOptions,
	): Promise<boolean> {
		const result = await Shell.run(command, options);
		return result.success;
	}

	/**
	 * 명령어 실행 (출력 없음, 종료 코드만)
	 */
	static async quiet(command: string, options?: ShellOptions): Promise<number> {
		const result = await Shell.run(command, options);
		return result.exitCode;
	}

	/**
	 * 파이프라인 실행
	 */
	static async pipe(
		commands: string[],
		options?: ShellOptions,
	): Promise<ShellResult> {
		const pipedCommand = commands.join(" | ");
		return await Shell.run(pipedCommand, options);
	}
}
