// ============================================================
// BunIgniter - Memory Session Driver
// 인메모리 Map 기반 세션 드라이버
// 기본 드라이버 (서버 재시작 시 초기화)
// ============================================================

import type { SessionDriver } from "./session_driver.ts";

const SESSION_COOKIE_NAME = "bunigniter_session";
const sessions = new Map<string, Record<string, any>>();

function generateSessionId(): string {
	return crypto.randomUUID();
}

/**
 * 인메모리 세션 드라이버
 * 기존 Session 클래스와 동일한 동작
 */
export class MemorySession implements SessionDriver {
	private sessionId: string = "";
	private data: Record<string, any> = {};
	private isDirty: boolean = false;

	constructor(request: Request, cookieName?: string) {
		const cookies = this.parseCookies(request);
		const name = cookieName ?? SESSION_COOKIE_NAME;
		this.sessionId = cookies[name] ?? generateSessionId();
		this.data = sessions.get(this.sessionId) ?? {};
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
		sessions.set(this.sessionId, this.data);
		this.isDirty = false;
	}

	destroy(): void {
		sessions.delete(this.sessionId);
		this.data = {};
		this.sessionId = generateSessionId();
		this.isDirty = false;
	}

	getCookieHeader(expiration?: number): string {
		this.save();
		const maxAge = expiration ?? 7200;
		return `${SESSION_COOKIE_NAME}=${this.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
	}

	/**
	 * 활성 세션 수 조회
	 */
	static count(): number {
		return sessions.size;
	}

	/**
	 * 모든 세션 초기화 (테스트용)
	 */
	static flush(): void {
		sessions.clear();
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
