// ============================================================
// BunIgniter - 분산 잠금 설정
// app/config/distributed_lock.ts
// ============================================================

export interface DistributedLockConfig {
	/** 드라이버: "memory" | "redis" */
	driver: string;
	/** Redis URL */
	redisUrl: string;
	/** 잠금 키 접두사 */
	keyPrefix: string;
	/** 기본 TTL (ms) */
	defaultTtl: number;
	/** 재시도 간격 (ms) */
	retryInterval: number;
	/** 최대 재시도 */
	maxRetries: number;
}

const config: DistributedLockConfig = {
	driver: process.env.LOCK_DRIVER ?? "memory",
	redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
	keyPrefix: "bunigniter:lock:",
	defaultTtl: Number(process.env.LOCK_DEFAULT_TTL ?? "60000"),
	retryInterval: Number(process.env.LOCK_RETRY_INTERVAL ?? "200"),
	maxRetries: Number(process.env.LOCK_MAX_RETRIES ?? "50"),
};

export default config;
