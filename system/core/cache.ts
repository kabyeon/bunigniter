// ============================================================
// BunIgniter - Cache Library
// 인메모리 + 파일 + Redis 기반 캐시 드라이버
// CodeIgniter3 의 $this->cache 와 유사
// ============================================================

import {
	existsSync,
	readFileSync,
	writeFileSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
} from "node:fs";
import { join } from "node:path";

/** 캐시 드라이버 인터페이스 (비동기) */
export interface CacheDriver {
	/** 캐시 저장 */
	set(key: string, value: any, ttl?: number): void | Promise<void>;
	/** 캐시 조회 */
	get<T = any>(key: string): T | null | Promise<T | null>;
	/** 캐시 존재 여부 */
	has(key: string): boolean | Promise<boolean>;
	/** 캐시 삭제 */
	forget(key: string): boolean | Promise<boolean>;
	/** 캐시 조회 후 삭제 */
	pull<T = any>(key: string): T | null | Promise<T | null>;
	/** 전체 캐시 삭제 */
	flush(): void | Promise<void>;
	/** 만료된 캐시 정리 */
	gc(): number | Promise<number>;
}

/** 캐시 설정 */
export interface CacheConfig {
	driver: string;
	prefix: string;
	path: string;
	defaultTtl: number;
	redisUrl: string;
	redisPrefix: string;
}

const DEFAULT_CONFIG: CacheConfig = {
	driver: "memory",
	prefix: "bunigniter:",
	path: "./storage/cache",
	defaultTtl: 3600,
	redisUrl: "redis://localhost:6379",
	redisPrefix: "bunigniter:cache:",
};

// ─── 인메모리 캐시 드라이버 ──────────────────────────

interface CacheEntry {
	value: any;
	expiration: number | null;
}

export class MemoryCacheDriver implements CacheDriver {
	private store: Map<string, CacheEntry> = new Map();
	private prefix: string;
	private defaultTtl: number;

	constructor(config?: Partial<CacheConfig>) {
		this.prefix = config?.prefix ?? DEFAULT_CONFIG.prefix;
		this.defaultTtl = config?.defaultTtl ?? DEFAULT_CONFIG.defaultTtl;
	}

	set(key: string, value: any, ttl?: number): void {
		const k = this.prefixKey(key);
		const expiration =
			ttl !== undefined
				? Date.now() + ttl * 1000
				: this.defaultTtl > 0
					? Date.now() + this.defaultTtl * 1000
					: null;
		this.store.set(k, { value, expiration });
	}

	get<T = any>(key: string): T | null {
		const k = this.prefixKey(key);
		const entry = this.store.get(k);
		if (!entry) return null;
		if (entry.expiration && entry.expiration < Date.now()) {
			this.store.delete(k);
			return null;
		}
		return entry.value as T;
	}

	has(key: string): boolean {
		return this.get(key) !== null;
	}

	forget(key: string): boolean {
		const k = this.prefixKey(key);
		return this.store.delete(k);
	}

	pull<T = any>(key: string): T | null {
		const value = this.get<T>(key);
		if (value !== null) this.forget(key);
		return value;
	}

	flush(): void {
		for (const key of this.store.keys()) {
			if (key.startsWith(this.prefix)) {
				this.store.delete(key);
			}
		}
	}

	gc(): number {
		let removed = 0;
		const now = Date.now();
		for (const [key, entry] of this.store.entries()) {
			if (entry.expiration && entry.expiration < now) {
				this.store.delete(key);
				removed++;
			}
		}
		return removed;
	}

	/** 저장된 항목 수 */
	size(): number {
		return this.store.size;
	}

	private prefixKey(key: string): string {
		return `${this.prefix}${key}`;
	}
}

// ─── 파일 캐시 드라이버 ──────────────────────────────

export class FileCacheDriver implements CacheDriver {
	private cacheDir: string;
	private prefix: string;
	private defaultTtl: number;

	constructor(config?: Partial<CacheConfig>) {
		this.cacheDir = config?.path ?? DEFAULT_CONFIG.path;
		this.prefix = config?.prefix ?? DEFAULT_CONFIG.prefix;
		this.defaultTtl = config?.defaultTtl ?? DEFAULT_CONFIG.defaultTtl;

		if (!existsSync(this.cacheDir)) {
			mkdirSync(this.cacheDir, { recursive: true });
		}
	}

	set(key: string, value: any, ttl?: number): void {
		const filePath = this.getFilePath(key);
		const expiration =
			ttl !== undefined
				? Date.now() + ttl * 1000
				: this.defaultTtl > 0
					? Date.now() + this.defaultTtl * 1000
					: null;

		const payload = { value, expiration };
		writeFileSync(filePath, JSON.stringify(payload), "utf-8");
	}

	get<T = any>(key: string): T | null {
		const entry = this.readEntry(key);
		if (!entry) return null;
		if (entry.expiration && entry.expiration < Date.now()) {
			this.forget(key);
			return null;
		}
		return entry.value as T;
	}

	has(key: string): boolean {
		return this.get(key) !== null;
	}

	forget(key: string): boolean {
		const filePath = this.getFilePath(key);
		try {
			if (existsSync(filePath)) {
				unlinkSync(filePath);
				return true;
			}
		} catch {
			// 삭제 실패 무시
		}
		return false;
	}

	pull<T = any>(key: string): T | null {
		const value = this.get<T>(key);
		if (value !== null) this.forget(key);
		return value;
	}

	flush(): void {
		if (!existsSync(this.cacheDir)) return;
		const files = readdirSync(this.cacheDir);
		for (const file of files) {
			if (file.startsWith("cache_")) {
				try {
					unlinkSync(join(this.cacheDir, file));
				} catch {
					// 무시
				}
			}
		}
	}

	gc(): number {
		if (!existsSync(this.cacheDir)) return 0;
		let removed = 0;
		const now = Date.now();
		const files = readdirSync(this.cacheDir);

		for (const file of files) {
			if (!file.startsWith("cache_")) continue;
			const filePath = join(this.cacheDir, file);
			try {
				const content = readFileSync(filePath, "utf-8");
				const entry = JSON.parse(content);
				if (entry.expiration && entry.expiration < now) {
					unlinkSync(filePath);
					removed++;
				}
			} catch {
				// 손상된 캐시 파일 삭제
				try {
					unlinkSync(filePath);
					removed++;
				} catch {
					// 무시
				}
			}
		}
		return removed;
	}

	private getFilePath(key: string): string {
		const hash = this.hashKey(key);
		return join(this.cacheDir, `cache_${hash}`);
	}

	private readEntry(
		key: string,
	): { value: any; expiration: number | null } | null {
		const filePath = this.getFilePath(key);
		try {
			const content = readFileSync(filePath, "utf-8");
			return JSON.parse(content);
		} catch {
			return null;
		}
	}

	private hashKey(key: string): string {
		const prefixedKey = `${this.prefix}${key}`;
		let hash = 0;
		for (let i = 0; i < prefixedKey.length; i++) {
			const char = prefixedKey.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash |= 0;
		}
		return Math.abs(hash).toString(36);
	}
}

// ─── Cache 매니저 ────────────────────────────────────

/**
 * 캐시 매니저
 * 설정에 따라 드라이버를 자동 선택합니다.
 *
 * 사용법:
 *   import { Cache } from "system/core/cache.ts";
 *
 *   Cache.put("key", { data: 123 });
 *   Cache.put("key", "value", 600);
 *   Cache.forever("key", "value");
 *   const val = Cache.get("key");
 *   Cache.has("key");
 *   Cache.forget("key");
 *   const val = Cache.pull("key");
 *   Cache.flush();
 *   Cache.gc();
 *   const data = await Cache.remember("users", 300, async () => {
 *     return await userModel.findAll();
 *   });
 */
export class Cache {
	private static driver: CacheDriver | null = null;
	private static config: CacheConfig = DEFAULT_CONFIG;

	/** 캐시 드라이버 설정 */
	static configure(config: Partial<CacheConfig>): void {
		Cache.config = { ...DEFAULT_CONFIG, ...config };
		Cache.driver = null; // 드라이버 재생성
	}

	/** 드라이버 가져오기 */
	static getDriver(): CacheDriver {
		if (!Cache.driver) {
			switch (Cache.config.driver) {
				case "file":
					Cache.driver = new FileCacheDriver(Cache.config);
					break;
				case "redis": {
					// Lazy import to avoid Redis dependency when not used
					const { RedisCacheDriver } = require("./redis_cache.ts");
					Cache.driver = new RedisCacheDriver(Cache.config);
					break;
				}
				case "memory":
				default:
					Cache.driver = new MemoryCacheDriver(Cache.config);
					break;
			}
		}
		return Cache.driver!;
	}

	/** 캐시 저장 */
	static put(key: string, value: any, ttl?: number): void | Promise<void> {
		return Cache.getDriver().set(key, value, ttl);
	}

	/** 영구 캐시 저장 */
	static forever(key: string, value: any): void | Promise<void> {
		return Cache.getDriver().set(key, value, 0);
	}

	/** 캐시 조회 */
	static get<T = any>(key: string): T | null | Promise<T | null> {
		return Cache.getDriver().get<T>(key);
	}

	/** 캐시 존재 여부 */
	static has(key: string): boolean | Promise<boolean> {
		return Cache.getDriver().has(key);
	}

	/** 캐시 삭제 */
	static forget(key: string): boolean | Promise<boolean> {
		return Cache.getDriver().forget(key);
	}

	/** 조회 후 삭제 */
	static pull<T = any>(key: string): T | null | Promise<T | null> {
		return Cache.getDriver().pull<T>(key);
	}

	/** 전체 삭제 */
	static flush(): void | Promise<void> {
		return Cache.getDriver().flush();
	}

	/** 만료된 캐시 정리 */
	static gc(): number | Promise<number> {
		return Cache.getDriver().gc();
	}

	/**
	 * 콜백 캐시 (Remember)
	 * 캐시에 값이 있으면 반환, 없으면 콜백을 실행하고 결과를 캐시에 저장
	 */
	static async remember<T>(
		key: string,
		ttl: number,
		callback: () => Promise<T>,
	): Promise<T> {
		const cached = await Cache.getDriver().get<T>(key);
		if (cached !== null) return cached;

		const value = await callback();
		await Cache.getDriver().set(key, value, ttl);
		return value;
	}

	/**
	 * 영구 콜백 캐시
	 */
	static async rememberForever<T>(
		key: string,
		callback: () => Promise<T>,
	): Promise<T> {
		const cached = await Cache.getDriver().get<T>(key);
		if (cached !== null) return cached;

		const value = await callback();
		await Cache.getDriver().set(key, value, 0);
		return value;
	}
}

/** 싱글톤 인스턴스 */
export const cache = Cache;
