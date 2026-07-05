// ============================================================
// BunIgniter - 캐시 설정
// app/config/cache.ts
// CodeIgniter3 의 application/config/cache 와 동일
// ============================================================

export interface CacheConfig {
	/** 캐시 드라이버: "memory" | "file" | "redis" */
	driver: string;
	/** 캐시 키 접두사 */
	prefix: string;
	/** 파일 캐시 경로 (file 드라이버 시) */
	path: string;
	/** 기본 TTL (초) */
	defaultTtl: number;
	/** Redis 연결 URL (redis 드라이버 시) */
	redisUrl: string;
	/** Redis 키 접두사 (redis 드라이버 시) */
	redisPrefix: string;
}

const config: CacheConfig = {
	driver: process.env.CACHE_DRIVER ?? "memory",

	prefix: process.env.CACHE_PREFIX ?? "bunigniter:",

	path: process.env.CACHE_PATH ?? "./storage/cache",

	defaultTtl: Number(process.env.CACHE_TTL ?? "3600"),

	redisUrl: process.env.CACHE_REDIS_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379",

	redisPrefix: process.env.CACHE_REDIS_PREFIX ?? "bunigniter:cache:",
};

export default config;
