// ============================================================
// BunIgniter - Redis Session Driver
// Bun 내장 RedisClient 기반 세션 드라이버
// SessionDriver 인터페이스 구현
// 분산 환경에서 세션 공유 가능
// ============================================================

import type { SessionDriver } from "./session_driver.ts";
import { RedisClient } from "bun";

const SESSION_COOKIE_NAME = "bunigniter_session";
const SESSION_KEY_PREFIX = "bunigniter:sess:";
const DEFAULT_EXPIRATION = 7200; // 2시간 (초)

/** Redis 연결 캐시 (URL → client) */
const clientCache = new Map<string, RedisClient>();

/**
 * Redis 세션 드라이버
 *
 * 사용법:
 *   import { RedisSession } from "system/core/redis_session.ts";
 *   const session = new RedisSession(request, { redisUrl: "redis://localhost:6379" });
 *   session.set("userId", 42);
 *   await session.save();
 *
 * 또는 SessionManager 를 통해:
 *   import { createSession } from "system/core/session_manager.ts";
 *   const session = createSession(request, { driver: "redis", redisUrl: "redis://localhost:6379" });
 */
export class RedisSession implements SessionDriver {
	private sessionId: string = "";
	private data: Record<string, any> = {};
	private isDirty: boolean = false;
	private client: RedisClient;
	private cookieName: string;
	private expiration: number;
	private keyPrefix: string;

	constructor(
		request: Request,
		options?: {
			redisUrl?: string;
			cookieName?: string;
			expiration?: number;
			keyPrefix?: string;
		},
	) {
		this.cookieName = options?.cookieName ?? SESSION_COOKIE_NAME;
		this.expiration = options?.expiration ?? DEFAULT_EXPIRATION;
		this.keyPrefix = options?.keyPrefix ?? SESSION_KEY_PREFIX;
		this.client = RedisSession.getClient(options?.redisUrl);

		// 쿠키에서 세션 ID 읽기
		const cookies = this.parseCookies(request);
		const sid = cookies[this.cookieName];

		if (sid) {
			this.sessionId = sid;
			// 비동기 로드는 loadFromRedis() 에서 처리
		} else {
			this.sessionId = crypto.randomUUID();
		}
	}

	/**
	 * Redis 에서 세션 데이터 로드 (생성 후 반드시 호출)
	 */
	async load(): Promise<void> {
		const key = this.getRedisKey();
		try {
			const raw = await this.client.get(key);
			if (raw) {
				this.data = JSON.parse(raw);
			} else if (this.sessionId) {
				// 세션 ID가 있지만 Redis에 없음 → 새 ID
				this.sessionId = crypto.randomUUID();
				this.data = {};
			}
		} catch {
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

	/**
	 * Redis 에 세션 저장
	 * SessionDriver 인터페이스는 동기 save() 지만 Redis 는 비동기이므로
	 * 실제 Redis 쓰기는 saveAsync() 에서 처리하고 save() 는 플래그만 설정
	 */
	save(): void {
		if (!this.isDirty) return;
		// 비동기 저장 트리거 (fire-and-forget)
		this.saveAsync().catch((err) => {
			console.error("[BunIgniter] Redis session save error:", err);
		});
		this.isDirty = false;
	}

	/**
	 * Redis 에 비동기 저장
	 */
	async saveAsync(): Promise<void> {
		if (!this.isDirty && Object.keys(this.data).length === 0) return;

		const key = this.getRedisKey();
		const payload = JSON.stringify({
			__meta: {
				createdAt: this.data.__meta?.createdAt ?? Date.now(),
				updatedAt: Date.now(),
			},
			...this.data,
		});

		await this.client.set(key, payload);
		await this.client.expire(key, this.expiration);
	}

	/**
	 * 세션 파기
	 */
	destroy(): void {
		const key = this.getRedisKey();
		this.client.del(key).catch((err) => {
			console.error("[BunIgniter] Redis session destroy error:", err);
		});
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
		const oldKey = this.getRedisKey();
		this.sessionId = crypto.randomUUID();
		// 이전 Redis 키 삭제
		this.client.del(oldKey).catch(() => {});
		// 데이터는 유지한 채 새 ID로 저장
		this.isDirty = true;
		this.save();
	}

	/**
	 * 비동기 세션 파기
	 */
	async destroyAsync(): Promise<void> {
		const key = this.getRedisKey();
		await this.client.del(key);
		this.data = {};
		this.sessionId = crypto.randomUUID();
		this.isDirty = false;
	}

	getCookieHeader(expiration?: number): string {
		// 쿠키 헤더 생성 전에 먼저 비동기 저장 실행
		this.save();
		const maxAge = expiration ?? this.expiration;
		return `${this.cookieName}=${this.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
	}

	/**
	 * 쿠키 헤더 생성 (비동기 - Redis 저장 완료 후)
	 */
	async getCookieHeaderAsync(expiration?: number): Promise<string> {
		await this.saveAsync();
		const maxAge = expiration ?? this.expiration;
		return `${this.cookieName}=${this.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
	}

	// ─── 정적 메서드 ──────────────────────────────────

	/**
	 * Redis 클라이언트 가져오기 (캐시)
	 */
	static getClient(url?: string): RedisClient {
		const redisUrl = url ?? process.env.REDIS_URL ?? "redis://localhost:6379";
		let client = clientCache.get(redisUrl);
		if (!client) {
			client = new RedisClient(redisUrl, {
				autoReconnect: true,
				maxRetries: 10,
				enableOfflineQueue: true,
			});
			clientCache.set(redisUrl, client);
		}
		return client;
	}

	/**
	 * 만료된 세션 정리 (Redis 는 자동 TTL 관리하므로 no-op)
	 */
	static gc(_maxAge?: number, _redisUrl?: string): number {
		// Redis 는 EXPIRE 로 자동 관리되므로 수동 GC 불필요
		return 0;
	}

	/**
	 * 활성 세션 수 조회
	 */
	static async count(redisUrl?: string): Promise<number> {
		const client = RedisSession.getClient(redisUrl);
		const keys = await client.keys(`${SESSION_KEY_PREFIX}*`);
		return keys.length;
	}

	/**
	 * 모든 세션 초기화 (테스트용)
	 */
	static async flush(redisUrl?: string): Promise<void> {
		const client = RedisSession.getClient(redisUrl);
		const keys = await client.keys(`${SESSION_KEY_PREFIX}*`);
		if (keys.length > 0) {
			for (const key of keys) {
				await client.del(key);
			}
		}
	}

	/**
	 * 연결 종료
	 */
	static closeAll(): void {
		for (const [, client] of clientCache) {
			client.close();
		}
		clientCache.clear();
	}

	// ─── 내부 메서드 ──────────────────────────────────

	private getRedisKey(): string {
		return `${this.keyPrefix}${this.sessionId}`;
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
