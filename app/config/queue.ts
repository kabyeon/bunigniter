// ============================================================
// BunIgniter - 큐 설정
// app/config/queue.ts
// ============================================================

export interface QueueConfig {
	/** 드라이버: "memory" | "redis" */
	driver: string;
	/** 기본 큐 이름 */
	defaultQueue: string;
	/** 기본 최대 재시도 */
	defaultMaxRetries: number;
	/** 잡 타임아웃 (ms) */
	jobTimeout: number;
	/** Redis URL (redis 드라이버 시) */
	redisUrl: string;
	/** 배치 사이즈 */
	batchSize: number;
	/** 폴링 간격 (ms) */
	pollInterval: number;
}

const config: QueueConfig = {
	driver: process.env.QUEUE_DRIVER ?? "memory",

	defaultQueue: process.env.QUEUE_DEFAULT ?? "default",

	defaultMaxRetries: Number(process.env.QUEUE_MAX_RETRIES ?? "3"),

	jobTimeout: Number(process.env.QUEUE_TIMEOUT ?? "60000"),

	redisUrl:
		process.env.QUEUE_REDIS_URL ??
		process.env.REDIS_URL ??
		"redis://localhost:6379",

	batchSize: Number(process.env.QUEUE_BATCH_SIZE ?? "10"),

	pollInterval: Number(process.env.QUEUE_POLL_INTERVAL ?? "1000"),
};

export default config;
