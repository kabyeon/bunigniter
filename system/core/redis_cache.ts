// ============================================================
// BunIgniter - Redis Cache Driver
// Bun 내장 RedisClient 기반 캐시 드라이버
// CacheDriver 인터페이스 구현
// 분산 환경에서 캐시 공유 가능
// ============================================================

import type { CacheDriver, CacheConfig } from "./cache.ts";
import { RedisClient } from "bun";

const DEFAULT_CONFIG: Partial<CacheConfig> = {
	driver: "redis",
	prefix: "bunigniter:",
	defaultTtl: 3600,
	redisUrl: "redis://localhost:6379",
	redisPrefix: "bunigniter:cache:",
};

/** Redis 연결 캐시 (URL → client) */
const clientCache = new Map<string, RedisClient>();

/**
 * Redis 캐시 드라이버
 *
 * 사용법:
 *   import { RedisCacheDriver } from "system/core/redis_cache.ts";
 *   const driver = new RedisCacheDriver({ redisUrl: "redis://localhost:6379" });
 *   await driver.set("key", { data: 123 }, 300);
 *   const val = await driver.get("key"); // { data: 123 }
 *
 * 또는 Cache 매니저를 통해:
 *   import { Cache } from "system/core/cache.ts";
 *   Cache.configure({ driver: "redis", redisUrl: "redis://localhost:6379" });
 *   await Cache.put("key", "value", 600);
 *   const val = await Cache.get("key");
 */
export class RedisCacheDriver implements CacheDriver {
	private client: RedisClient;
	private defaultTtl: number;
	private keyPrefix: string;

	constructor(
		config?: Partial<CacheConfig> & { redisUrl?: string; keyPrefix?: string },
	) {
		this.defaultTtl = config?.defaultTtl ?? DEFAULT_CONFIG.defaultTtl ?? 3600;
		this.keyPrefix =
			config?.keyPrefix ?? config?.redisPrefix ?? "bunigniter:cache:";
		this.client = RedisCacheDriver.getClient(config?.redisUrl);
	}

	set(key: string, value: any, ttl?: number): Promise<void> {
		return this.setAsync(key, value, ttl);
	}

	get<T = any>(key: string): Promise<T | null> {
		return this.getAsync(key);
	}

	has(key: string): Promise<boolean> {
		return this.hasAsync(key);
	}

	forget(key: string): Promise<boolean> {
		return this.forgetAsync(key);
	}

	pull<T = any>(key: string): Promise<T | null> {
		return this.pullAsync(key);
	}

	flush(): Promise<void> {
		return this.flushAsync();
	}

	gc(): Promise<number> {
		// Redis 는 TTL 로 자동 만료되므로 수동 GC 불필요
		return Promise.resolve(0);
	}

	// ─── 비동기 구현 ──────────────────────────────────

	private async setAsync(key: string, value: any, ttl?: number): Promise<void> {
		const k = this.prefixKey(key);
		const expiration =
			ttl !== undefined ? ttl : this.defaultTtl > 0 ? this.defaultTtl : 0;

		const payload = JSON.stringify({
			value,
			expiration: expiration > 0 ? Date.now() + expiration * 1000 : null,
		});

		if (expiration > 0) {
			await this.client.set(k, payload, "EX", expiration);
		} else {
			await this.client.set(k, payload);
		}
	}

	private async getAsync<T = any>(key: string): Promise<T | null> {
		const k = this.prefixKey(key);
		const raw = await this.client.get(k);

		if (!raw) return null;

		try {
			const entry = JSON.parse(raw);
			if (entry.expiration && entry.expiration < Date.now()) {
				await this.client.del(k);
				return null;
			}
			return entry.value as T;
		} catch {
			return null;
		}
	}

	private async hasAsync(key: string): Promise<boolean> {
		const k = this.prefixKey(key);
		return await this.client.exists(k);
	}

	private async forgetAsync(key: string): Promise<boolean> {
		const k = this.prefixKey(key);
		const existed = await this.client.exists(k);
		if (existed) {
			await this.client.del(k);
		}
		return existed;
	}

	private async pullAsync<T = any>(key: string): Promise<T | null> {
		const value = await this.getAsync<T>(key);
		if (value !== null) await this.forgetAsync(key);
		return value;
	}

	private async flushAsync(): Promise<void> {
		const pattern = `${this.keyPrefix}*`;
		const keys = await this.client.keys(pattern);
		if (keys.length > 0) {
			for (const key of keys) {
				await this.client.del(key);
			}
		}
	}

	/**
	 * 저장된 캐시 키 수
	 */
	async size(): Promise<number> {
		const pattern = `${this.keyPrefix}*`;
		const keys = await this.client.keys(pattern);
		return keys.length;
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
	 * 연결 종료
	 */
	static closeAll(): void {
		for (const [, client] of clientCache) {
			client.close();
		}
		clientCache.clear();
	}

	private prefixKey(key: string): string {
		return `${this.keyPrefix}${key}`;
	}
}
