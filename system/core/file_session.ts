// ============================================================
// BunIgniter - File Session Driver
// 인메모리 Map 대신 파일 기반 세션 저장
// 서버 재시작해도 세션이 유지됩니다.
// SessionDriver 인터페이스 구현
// ============================================================

import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { SessionDriver } from "./session_driver.ts";

const DEFAULT_SESSION_DIR = join(process.cwd(), "storage", "sessions");
const SESSION_COOKIE_NAME = "bunigniter_session";
const SESSION_PREFIX = "sess_";
const DEFAULT_EXPIRATION = 7200; // 2시간 (초)

/** 세션 ID 유효성 검증 (UUID v4 형식, 경로 순회 방지) */
function isValidSessionId(sid: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sid);
}

/** 파일 기반 세션 드라이버 */
export class FileSession implements SessionDriver {
	private sessionId: string = "";
	private data: Record<string, any> = {};
	private isDirty: boolean = false;
	private sessionDir: string;
	private cookieName: string;

	constructor(request: Request, options?: { sessionDir?: string; cookieName?: string }) {
		this.sessionDir = options?.sessionDir ?? DEFAULT_SESSION_DIR;
		this.cookieName = options?.cookieName ?? SESSION_COOKIE_NAME;

		// 세션 디렉토리 보장
		if (!existsSync(this.sessionDir)) {
			mkdirSync(this.sessionDir, { recursive: true });
		}

		// 쿠키에서 세션 ID 읽기
		const cookies = this.parseCookies(request);
		const sid = cookies[this.cookieName];

		if (sid && isValidSessionId(sid) && this.sessionExists(sid)) {
			this.sessionId = sid;
			this.data = this.readSessionFile(sid);
		} else {
			this.sessionId = crypto.randomUUID();
			this.data = {};
		}
	}

	set(key: string, value: any): void {
		this.data[key] = value;
		this.isDirty = true;
	}

	get(key: string): any {
		return this.data[key];
	}

	has(key: string): boolean {
		return key in this.data;
	}

	remove(key: string): void {
		delete this.data[key];
		this.isDirty = true;
	}

	all(): Record<string, any> {
		return { ...this.data };
	}

	flash(key: string, value: any): void {
		this.data[`__flash_${key}`] = value;
		this.isDirty = true;
	}

	getFlash(key: string): any {
		const flashKey = `__flash_${key}`;
		const value = this.data[flashKey];
		if (value !== undefined) {
			delete this.data[flashKey];
			this.isDirty = true;
		}
		return value;
	}

	getId(): string {
		return this.sessionId;
	}

	save(): void {
		if (!this.isDirty) return;

		const filePath = this.getFilePath(this.sessionId);
		const payload = {
			__meta: {
				createdAt: this.data.__meta?.createdAt ?? Date.now(),
				updatedAt: Date.now(),
			},
			...this.data,
		};

		writeFileSync(filePath, JSON.stringify(payload), "utf-8");
		this.isDirty = false;
	}

	destroy(): void {
		const filePath = this.getFilePath(this.sessionId);
		try {
			if (existsSync(filePath)) {
				unlinkSync(filePath);
			}
		} catch {
			// 삭제 실패 무시
		}
		this.data = {};
		this.sessionId = crypto.randomUUID();
		this.isDirty = false;
	}

	/**
	 * 세션 ID 재생성 (세션 고정 공격 방어)
	 * 로그인 성공 후 호출하여 공격자가 알고 있는 세션 ID를 무효화합니다.
	 * 기존 세션 데이터는 새 ID로 이전됩니다.
	 */
	regenerateId(): void {
		const oldId = this.sessionId;
		const oldFile = this.getFilePath(oldId);
		this.sessionId = crypto.randomUUID();
		// 이전 세션 파일 삭제
		try {
			unlinkSync(oldFile);
		} catch {
			/* 이미 삭제됨 */
		}
		// 데이터는 유지한 채 새 ID로 저장
		this.save();
	}

	getCookieHeader(expiration?: number): string {
		this.save();
		const maxAge = expiration ?? DEFAULT_EXPIRATION;
		return `${this.cookieName}=${this.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
	}

	// ─── 정적 메서드 (GC 등) ──────────────────────────

	/**
	 * 만료된 세션 파일 정리 (Garbage Collection)
	 */
	static gc(maxAge: number = DEFAULT_EXPIRATION, sessionDir?: string): number {
		const dir = sessionDir ?? DEFAULT_SESSION_DIR;
		if (!existsSync(dir)) return 0;

		const now = Date.now();
		let removed = 0;

		const files = readdirSync(dir);
		for (const file of files) {
			if (!file.startsWith(SESSION_PREFIX)) continue;

			const filePath = join(dir, file);
			try {
				const stat = statSync(filePath);
				const age = (now - stat.mtimeMs) / 1000;

				if (age > maxAge) {
					unlinkSync(filePath);
					removed++;
				}
			} catch {
				// 파일 접근 오류 무시
			}
		}

		return removed;
	}

	/**
	 * 활성 세션 수 조회
	 */
	static count(sessionDir?: string): number {
		const dir = sessionDir ?? DEFAULT_SESSION_DIR;
		if (!existsSync(dir)) return 0;
		return readdirSync(dir).filter((f) => f.startsWith(SESSION_PREFIX)).length;
	}

	// ─── 내부 메서드 ──────────────────────────────────

	private getFilePath(sid: string): string {
		return join(this.sessionDir, `${SESSION_PREFIX}${sid}`);
	}

	private sessionExists(sid: string): boolean {
		return existsSync(this.getFilePath(sid));
	}

	private readSessionFile(sid: string): Record<string, any> {
		try {
			const filePath = this.getFilePath(sid);
			const content = readFileSync(filePath, "utf-8");
			return JSON.parse(content);
		} catch {
			return {};
		}
	}

	private parseCookies(request: Request): Record<string, string> {
		const cookieHeader = request.headers.get("cookie") ?? "";
		const cookies: Record<string, string> = {};
		for (const pair of cookieHeader.split(";")) {
			const [key, ...rest] = pair.split("=");
			if (key) cookies[key.trim()] = rest.join("=").trim();
		}
		return cookies;
	}
}
