// ============================================================
// BunIgniter - File Session Store
// 인메모리 Map 대신 파일 기반 세션 저장
// 서버 재시작해도 세션이 유지됩니다.
// ============================================================

import {
	readFileSync,
	writeFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
	statSync,
} from "node:fs";
import { join } from "node:path";

const SESSION_DIR = join(process.cwd(), "storage", "sessions");
const SESSION_COOKIE_NAME = "bunigniter_session";
const SESSION_PREFIX = "sess_";
const DEFAULT_EXPIRATION = 7200; // 2시간 (초)

/** 파일 기반 세션 관리 */
export class FileSession {
	private sessionId: string = "";
	private data: Record<string, any> = {};
	private isDirty: boolean = false;

	constructor(request: Request) {
		// 세션 디렉토리 보장
		if (!existsSync(SESSION_DIR)) {
			mkdirSync(SESSION_DIR, { recursive: true });
		}

		// 쿠키에서 세션 ID 읽기
		const cookies = this.parseCookies(request);
		const sid = cookies[SESSION_COOKIE_NAME];

		if (sid && this.sessionExists(sid)) {
			this.sessionId = sid;
			this.data = this.readSessionFile(sid);
		} else {
			this.sessionId = crypto.randomUUID();
			this.data = {};
		}
	}

	/** 세션 데이터 설정 */
	set(key: string, value: any): void {
		this.data[key] = value;
		this.isDirty = true;
	}

	/** 세션 데이터 조회 */
	get(key: string): any {
		return this.data[key];
	}

	/** 세션 데이터 존재 여부 */
	has(key: string): boolean {
		return key in this.data;
	}

	/** 세션 데이터 삭제 */
	remove(key: string): void {
		delete this.data[key];
		this.isDirty = true;
	}

	/** 전체 세션 데이터 */
	all(): Record<string, any> {
		return { ...this.data };
	}

	/** Flash 데이터 설정 (1회성) */
	flash(key: string, value: any): void {
		this.data[`__flash_${key}`] = value;
		this.isDirty = true;
	}

	/** Flash 데이터 조회 후 삭제 */
	getFlash(key: string): any {
		const flashKey = `__flash_${key}`;
		const value = this.data[flashKey];
		if (value !== undefined) {
			delete this.data[flashKey];
			this.isDirty = true;
		}
		return value;
	}

	/** 세션 ID 반환 */
	getId(): string {
		return this.sessionId;
	}

	/** 쿠키 헤더 값 생성 */
	getCookieHeader(expiration?: number): string {
		this.save();
		const maxAge = expiration ?? DEFAULT_EXPIRATION;
		return `${SESSION_COOKIE_NAME}=${this.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
	}

	/** 세션 파기 */
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

	/** 세션 저장 (명시적 호출 또는 getCookieHeader 시 자동) */
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

	// ─── 정적 메서드 (GC 등) ──────────────────────────

	/**
	 * 만료된 세션 파일 정리 (Garbage Collection)
	 * CodeIgniter3: sess_expiration 기반 자동 정리
	 */
	static gc(maxAge: number = DEFAULT_EXPIRATION): number {
		if (!existsSync(SESSION_DIR)) return 0;

		const now = Date.now();
		let removed = 0;

		const files = readdirSync(SESSION_DIR);
		for (const file of files) {
			if (!file.startsWith(SESSION_PREFIX)) continue;

			const filePath = join(SESSION_DIR, file);
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
	static count(): number {
		if (!existsSync(SESSION_DIR)) return 0;
		return readdirSync(SESSION_DIR).filter((f) => f.startsWith(SESSION_PREFIX))
			.length;
	}

	// ─── 내부 메서드 ──────────────────────────────────

	private getFilePath(sid: string): string {
		return join(SESSION_DIR, `${SESSION_PREFIX}${sid}`);
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
