// ============================================================
// BunIgniter - Logging System
// CodeIgniter3 의 log_message() 와 동일
// 파일 기반 로깅 + 레벨 필터링 + 로그 회전
// ============================================================

import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, appendFileSync } from "node:fs";
import { join } from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	fatal: 4,
};

const LOG_COLORS: Record<LogLevel, string> = {
	debug: "\x1b[36m", // cyan
	info: "\x1b[32m", // green
	warn: "\x1b[33m", // yellow
	error: "\x1b[31m", // red
	fatal: "\x1b[35m", // magenta
};

const RESET = "\x1b[0m";

export interface LoggerOptions {
	/** 로그 디렉토리 (기본: "storage/logs") */
	logDir?: string;
	/** 최소 로그 레벨 (기본: "debug" in dev, "info" in prod) */
	minLevel?: LogLevel;
	/** 콘솔 출력 (기본: true) */
	console?: boolean;
	/** 파일 출력 (기본: true) */
	file?: boolean;
	/** 로그 포맷 (기본: "[{timestamp}] [{level}] {message}") */
	format?: string;
	/** 최대 파일 크기 (바이트, 기본: 10MB) */
	maxFileSize?: number;
	/** 최대 로그 파일 수 (기본: 30) */
	maxFiles?: number;
	/** 타임존 (기본: 로컬) */
	timezone?: string;
}

/**
 * BunIgniter 로거
 *
 * 사용법:
 *   import { logger } from "system/core/logger.ts";
 *
 *   logger.info("서버 시작");
 *   logger.warn("메모리 부족", { used: "90%" });
 *   logger.error("DB 연결 실패", { error: err.message });
 *   logger.debug("요청 데이터", { body: data });
 *
 * CodeIgniter3:
 *   log_message('info', '서버 시작');
 *   log_message('error', 'DB 연결 실패: ' . $err->getMessage());
 */
export class Logger {
	private logDir: string;
	private minLevel: LogLevel;
	private enableConsole: boolean;
	private enableFile: boolean;
	private format: string;
	private maxFileSize: number;
	private maxFiles: number;

	constructor(options: LoggerOptions = {}) {
		this.logDir = options.logDir ?? join(process.cwd(), "storage", "logs");
		this.minLevel = options.minLevel
			?? (process.env.NODE_ENV === "production" ? "info" : "debug");
		this.enableConsole = options.console ?? true;
		this.enableFile = options.file ?? true;
		this.format = options.format ?? "[{timestamp}] [{level}] {message}";
		this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB
		this.maxFiles = options.maxFiles ?? 30;

		// 로그 디렉토리 보장
		if (this.enableFile && !existsSync(this.logDir)) {
			mkdirSync(this.logDir, { recursive: true });
		}
	}

	/** 디버그 로그 */
	debug(message: string, context?: Record<string, any>): void {
		this.log("debug", message, context);
	}

	/** 정보 로그 */
	info(message: string, context?: Record<string, any>): void {
		this.log("info", message, context);
	}

	/** 경고 로그 */
	warn(message: string, context?: Record<string, any>): void {
		this.log("warn", message, context);
	}

	/** 에러 로그 */
	error(message: string, context?: Record<string, any>): void {
		this.log("error", message, context);
	}

	/** 치명적 에러 로그 */
	fatal(message: string, context?: Record<string, any>): void {
		this.log("fatal", message, context);
	}

	/**
	 * 로그 작성
	 */
	private log(level: LogLevel, message: string, context?: Record<string, any>): void {
		// 레벨 필터링
		if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return;

		const timestamp = this.getTimestamp();
		const contextStr = context ? ` ${JSON.stringify(context)}` : "";

		// 포맷 적용
		const formatted = this.format
			.replace("{timestamp}", timestamp)
			.replace("{level}", level.toUpperCase().padEnd(5))
			.replace("{message}", message + contextStr);

		// 콘솔 출력 (색상)
		if (this.enableConsole) {
			const color = LOG_COLORS[level];
			console.log(`${color}${formatted}${RESET}`);
		}

		// 파일 출력
		if (this.enableFile) {
			this.writeToFile(formatted);
		}
	}

	/**
	 * 파일에 로그 작성
	 */
	private writeToFile(formatted: string): void {
		const date = new Date().toISOString().split("T")[0];
		const fileName = `app-${date}.log`;
		const filePath = join(this.logDir, fileName);

		try {
			// 파일 크기 확인 → 회전
			if (existsSync(filePath)) {
				const stat = statSync(filePath);
				if (stat.size > this.maxFileSize) {
					this.rotateLogs();
				}
			}

			appendFileSync(filePath, formatted + "\n", "utf-8");
		} catch (err: any) {
			console.error(`로그 파일 쓰기 실패: ${err.message}`);
		}
	}

	/**
	 * 로그 파일 회전
	 */
	private rotateLogs(): void {
		try {
			const files = readdirSync(this.logDir)
				.filter((f) => f.endsWith(".log"))
				.sort();

			// 오래된 파일 삭제
			while (files.length > this.maxFiles) {
				const oldest = files.shift();
				if (oldest) {
					unlinkSync(join(this.logDir, oldest));
				}
			}
		} catch {
			// 회전 실패 무시
		}
	}

	/**
	 * 타임스탬프 생성
	 */
	private getTimestamp(): string {
		const now = new Date();
		return now.toISOString().replace("T", " ").replace("Z", "");
	}
}

/** 기본 로거 인스턴스 (싱글톤) */
export const logger = new Logger();

/**
 * CI3 호환 함수
 * log_message('info', '메시지');
 */
export function logMessage(level: LogLevel, message: string): void {
	logger[level](message);
}
