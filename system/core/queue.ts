// ============================================================
// BunIgniter - Queue / Job System
// 백그라운드 작업 큐 시스템
// 동기 (메모리) + Redis 드라이버 지원
// 지연 실행, 재시도, 실패 처리
// ============================================================

import { RedisClient } from "bun";

// ─── 잡 인터페이스 ──────────────────────────────────

/** 잡 페이로드 */
export interface JobPayload {
	/** 잡 고유 ID */
	id: string;
	/** 큐 이름 */
	queue: string;
	/** 잡 타입 (클래스명 등) */
	type: string;
	/** 잡 데이터 */
	data: any;
	/** 시도 횟수 */
	attempts: number;
	/** 최대 재시도 횟수 */
	maxRetries: number;
	/** 생성 시각 (ms) */
	createdAt: number;
	/** 실행 가능 시각 (ms, 지연 실행) */
	availableAt: number;
	/** 예약 시각 (ms, 현재 처리 중인 잡) */
	reservedAt: number | null;
}

/** 잡 처리 핸들러 */
export type JobHandler = (data: any) => Promise<void>;

// ─── 큐 드라이버 인터페이스 ──────────────────────────

export interface QueueDriver {
	/** 잡 푸시 */
	push(payload: JobPayload): Promise<void> | void;
	/** 잡 팝 (예약) */
	pop(queue: string): Promise<JobPayload | null> | JobPayload | null;
	/** 잡 완료 (삭제) */
	complete(payload: JobPayload): Promise<void> | void;
	/** 잡 실패 (재시도 또는 실패 큐) */
	fail(payload: JobPayload, error: string): Promise<void> | void;
	/** 실패 잡 조회 */
	failed(queue: string, limit?: number): Promise<JobPayload[]> | JobPayload[];
	/** 큐 크기 */
	size(queue: string): Promise<number> | number;
	/** 실패 큐 크기 */
	failedSize(queue: string): Promise<number> | number;
	/** 실패 잡 전체 삭제 */
	flushFailed(queue: string): Promise<void> | void;
	/** 예약 만료 잡 복구 (타임아웃된 잡) */
	recoverTimeout(queue: string, timeoutMs: number): Promise<number> | number;
}

// ─── 메모리 큐 드라이버 ─────────────────────────────

export class MemoryQueueDriver implements QueueDriver {
	private queues: Map<string, JobPayload[]> = new Map();
	private failedQueues: Map<string, Array<JobPayload & { error: string }>> = new Map();

	push(payload: JobPayload): void {
		const queue = this.getQueue(payload.queue);
		// 지연 실행: availableAt 기준으로 정렬 삽입
		if (payload.availableAt > Date.now()) {
			// 지연 잡은 availableAt 순으로 정렬
			const insertIndex = queue.findIndex((j) => j.availableAt > payload.availableAt);
			if (insertIndex === -1) {
				queue.push(payload);
			} else {
				queue.splice(insertIndex, 0, payload);
			}
		} else {
			queue.push(payload);
		}
	}

	pop(queueName: string): JobPayload | null {
		const queue = this.getQueue(queueName);
		const now = Date.now();

		const index = queue.findIndex((j) => j.availableAt <= now && j.reservedAt === null);

		if (index === -1) return null;

		const job = queue[index];
		job.reservedAt = now;
		return job;
	}

	complete(payload: JobPayload): void {
		const queue = this.getQueue(payload.queue);
		const index = queue.findIndex((j) => j.id === payload.id);
		if (index !== -1) {
			queue.splice(index, 1);
		}
	}

	fail(payload: JobPayload, error: string): void {
		const queue = this.getQueue(payload.queue);
		const index = queue.findIndex((j) => j.id === payload.id);
		if (index !== -1) {
			queue.splice(index, 1);
		}

		// 재시도 가능하면 다시 큐에
		if (payload.attempts < payload.maxRetries) {
			const retryJob: JobPayload = {
				...payload,
				attempts: payload.attempts + 1,
				reservedAt: null,
				availableAt: Date.now() + this.retryDelay(payload.attempts),
			};
			queue.push(retryJob);
		} else {
			// 최대 재시도 초과 → 실패 큐
			const failedQueue = this.getFailedQueue(payload.queue);
			failedQueue.push({ ...payload, error });
		}
	}

	failed(queueName: string, limit: number = 50): JobPayload[] {
		const failedQueue = this.getFailedQueue(queueName);
		return failedQueue.slice(0, limit);
	}

	size(queueName: string): number {
		const now = Date.now();
		return this.getQueue(queueName).filter((j) => j.reservedAt === null && j.availableAt <= now)
			.length;
	}

	failedSize(queueName: string): number {
		return this.getFailedQueue(queueName).length;
	}

	flushFailed(queueName: string): void {
		this.failedQueues.set(queueName, []);
	}

	recoverTimeout(queueName: string, timeoutMs: number): number {
		const queue = this.getQueue(queueName);
		const now = Date.now();
		let recovered = 0;

		for (const job of queue) {
			if (job.reservedAt && now - job.reservedAt > timeoutMs) {
				job.reservedAt = null;
				job.attempts++;
				recovered++;
			}
		}

		return recovered;
	}

	// ─── 내부 메서드 ──────────────────────────────────

	private getQueue(name: string): JobPayload[] {
		if (!this.queues.has(name)) {
			this.queues.set(name, []);
		}
		return this.queues.get(name)!;
	}

	private getFailedQueue(name: string): Array<JobPayload & { error: string }> {
		if (!this.failedQueues.has(name)) {
			this.failedQueues.set(name, []);
		}
		return this.failedQueues.get(name)!;
	}

	private retryDelay(attempt: number): number {
		// 지수 백오프: 5s, 25s, 125s...
		return Math.min(5 * 5 ** attempt * 1000, 300000);
	}
}

// ─── Redis 큐 드라이버 ──────────────────────────────

export class RedisQueueDriver implements QueueDriver {
	private client: RedisClient;
	private keyPrefix: string;

	constructor(options?: { redisUrl?: string; keyPrefix?: string }) {
		const url = options?.redisUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379";
		this.keyPrefix = options?.keyPrefix ?? "bunigniter:queue:";
		this.client = new RedisClient(url, {
			autoReconnect: true,
			maxRetries: 10,
			enableOfflineQueue: true,
		});
	}

	async push(payload: JobPayload): Promise<void> {
		const key = `${this.keyPrefix}${payload.queue}`;
		const data = JSON.stringify(payload);
		const score = payload.availableAt;

		// Sorted Set으로 availableAt 기준 정렬
		await this.client.send("ZADD", [key, score.toString(), data]);
	}

	async pop(queueName: string): Promise<JobPayload | null> {
		const key = `${this.keyPrefix}${queueName}`;
		const now = Date.now();

		// availableAt <= now 인 첫 번째 잡 조회
		const results = await this.client.send("ZRANGEBYSCORE", [
			key,
			"0",
			now.toString(),
			"LIMIT",
			"0",
			"1",
		]);

		if (!results || !Array.isArray(results) || results.length === 0) {
			return null;
		}

		let job: JobPayload;
		try {
			job = JSON.parse(results[0]) as JobPayload;
		} catch {
			return null;
		}

		// 예약 상태로 변경 (임시 키에 이동)
		job.reservedAt = now;
		const reservedKey = `${this.keyPrefix}${queueName}:reserved`;
		await this.client.send("ZREM", [key, results[0]]);
		await this.client.send("HSET", [reservedKey, job.id, JSON.stringify(job)]);

		return job;
	}

	async complete(payload: JobPayload): Promise<void> {
		const reservedKey = `${this.keyPrefix}${payload.queue}:reserved`;
		await this.client.send("HDEL", [reservedKey, payload.id]);
	}

	async fail(payload: JobPayload, error: string): Promise<void> {
		const reservedKey = `${this.keyPrefix}${payload.queue}:reserved`;
		await this.client.send("HDEL", [reservedKey, payload.id]);

		if (payload.attempts < payload.maxRetries) {
			// 재시도
			const retryJob: JobPayload = {
				...payload,
				attempts: payload.attempts + 1,
				reservedAt: null,
				availableAt: Date.now() + this.retryDelay(payload.attempts),
			};
			await this.push(retryJob);
		} else {
			// 실패 큐
			const failedKey = `${this.keyPrefix}${payload.queue}:failed`;
			await this.client.send("LPUSH", [failedKey, JSON.stringify({ ...payload, error })]);
		}
	}

	async failed(queueName: string, limit: number = 50): Promise<JobPayload[]> {
		const failedKey = `${this.keyPrefix}${queueName}:failed`;
		const results = await this.client.send("LRANGE", [failedKey, "0", (limit - 1).toString()]);
		if (!Array.isArray(results)) return [];
		return results
			.map((r: string) => {
				try {
					return JSON.parse(r);
				} catch {
					return null;
				}
			})
			.filter(Boolean) as JobPayload[];
	}

	async size(queueName: string): Promise<number> {
		const key = `${this.keyPrefix}${queueName}`;
		const now = Date.now();
		// availableAt <= now 인 항목 수
		return (await this.client.send("ZCOUNT", [key, "0", now.toString()])) as unknown as number;
	}

	async failedSize(queueName: string): Promise<number> {
		const failedKey = `${this.keyPrefix}${queueName}:failed`;
		return (await this.client.send("LLEN", [failedKey])) as unknown as number;
	}

	async flushFailed(queueName: string): Promise<void> {
		const failedKey = `${this.keyPrefix}${queueName}:failed`;
		await this.client.del(failedKey);
	}

	async recoverTimeout(queueName: string, timeoutMs: number): Promise<number> {
		const reservedKey = `${this.keyPrefix}${queueName}:reserved`;
		const now = Date.now();
		let recovered = 0;

		const all = await this.client.send("HGETALL", [reservedKey]);
		if (!all || typeof all !== "object") return 0;

		const entries = Array.isArray(all) ? all : Object.entries(all);
		for (let i = 0; i < entries.length; i += 2) {
			try {
				const job = JSON.parse(entries[i + 1]) as JobPayload;
				if (job.reservedAt && now - job.reservedAt > timeoutMs) {
					job.reservedAt = null;
					job.attempts++;
					await this.client.send("HDEL", [reservedKey, job.id]);
					await this.push(job);
					recovered++;
				}
			} catch {
				// 파싱 실패 무시
			}
		}

		return recovered;
	}

	private retryDelay(attempt: number): number {
		return Math.min(5 * 5 ** attempt * 1000, 300000);
	}
}

// ─── Queue 매니저 ────────────────────────────────────

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

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
	driver: "memory",
	defaultQueue: "default",
	defaultMaxRetries: 3,
	jobTimeout: 60000,
	redisUrl: "redis://localhost:6379",
	batchSize: 10,
	pollInterval: 1000,
};

/**
 * 큐 매니저
 *
 * 사용법:
 *   import { Queue } from "system/core/queue.ts";
 *
 *   // 잡 핸들러 등록
 *   Queue.register("SendEmailJob", async (data) => {
 *     const mailer = new Email();
 *     await mailer.send(data);
 *   });
 *
 *   // 잡 디스패치
 *   await Queue.push("SendEmailJob", { to: "user@test.com", subject: "Hello" });
 *
 *   // 지연 실행 (60초 후)
 *   await Queue.later(60, "SendEmailJob", { to: "user@test.com" });
 *
 *   // 특정 큐에 푸시
 *   await Queue.push("ProcessVideoJob", { videoId: 123 }, "videos");
 *
 *   // 워커 시작
 *   Queue.work("default");
 */
export class Queue {
	private static driver: QueueDriver | null = null;
	private static config: QueueConfig = DEFAULT_QUEUE_CONFIG;
	private static handlers: Map<string, JobHandler> = new Map();
	private static running: boolean = false;
	private static timers: ReturnType<typeof setInterval>[] = [];

	/** 설정 */
	static configure(config: Partial<QueueConfig>): void {
		Queue.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
		Queue.driver = null;
	}

	/** 드라이버 가져오기 */
	static getDriver(): QueueDriver {
		if (!Queue.driver) {
			switch (Queue.config.driver) {
				case "redis":
					Queue.driver = new RedisQueueDriver({
						redisUrl: Queue.config.redisUrl,
					});
					break;
				default:
					Queue.driver = new MemoryQueueDriver();
					break;
			}
		}
		return Queue.driver!;
	}

	/** 잡 핸들러 등록 */
	static register(type: string, handler: JobHandler): void {
		Queue.handlers.set(type, handler);
	}

	/** 여러 핸들러 일괄 등록 */
	static registerMany(handlers: Record<string, JobHandler>): void {
		for (const [type, handler] of Object.entries(handlers)) {
			Queue.handlers.set(type, handler);
		}
	}

	/** 잡 푸시 */
	static async push(type: string, data: any, queue?: string): Promise<string> {
		const id = crypto.randomUUID();
		const payload: JobPayload = {
			id,
			queue: queue ?? Queue.config.defaultQueue,
			type,
			data,
			attempts: 0,
			maxRetries: Queue.config.defaultMaxRetries,
			createdAt: Date.now(),
			availableAt: Date.now(),
			reservedAt: null,
		};

		await Queue.getDriver().push(payload);
		return id;
	}

	/** 지연 잡 푸시 */
	static async later(delay: number, type: string, data: any, queue?: string): Promise<string> {
		const id = crypto.randomUUID();
		const payload: JobPayload = {
			id,
			queue: queue ?? Queue.config.defaultQueue,
			type,
			data,
			attempts: 0,
			maxRetries: Queue.config.defaultMaxRetries,
			createdAt: Date.now(),
			availableAt: Date.now() + delay * 1000,
			reservedAt: null,
		};

		await Queue.getDriver().push(payload);
		return id;
	}

	/** 특정 시각에 실행 */
	static async scheduleAt(date: Date, type: string, data: any, queue?: string): Promise<string> {
		const delay = Math.max(0, date.getTime() - Date.now()) / 1000;
		return Queue.later(delay, type, data, queue);
	}

	/** 큐 크기 */
	static async size(queue?: string): Promise<number> {
		return await Queue.getDriver().size(queue ?? Queue.config.defaultQueue);
	}

	/** 실패 잡 조회 */
	static async failed(queue?: string, limit?: number): Promise<JobPayload[]> {
		return await Queue.getDriver().failed(queue ?? Queue.config.defaultQueue, limit);
	}

	/** 실패 큐 크기 */
	static async failedSize(queue?: string): Promise<number> {
		return await Queue.getDriver().failedSize(queue ?? Queue.config.defaultQueue);
	}

	/** 실패 잡 전체 삭제 */
	static async flushFailed(queue?: string): Promise<void> {
		await Queue.getDriver().flushFailed(queue ?? Queue.config.defaultQueue);
	}

	/** 타임아웃 잡 복구 */
	static async recoverTimeout(queue?: string): Promise<number> {
		return await Queue.getDriver().recoverTimeout(
			queue ?? Queue.config.defaultQueue,
			Queue.config.jobTimeout,
		);
	}

	/**
	 * 워커 시작
	 * 큐에서 잡을 꺼내서 핸들러를 실행합니다.
	 */
	static work(queue?: string): void {
		const queueName = queue ?? Queue.config.defaultQueue;

		if (Queue.running) {
			console.warn(`[BunIgniter] Queue worker already running`);
			return;
		}

		Queue.running = true;
		console.log(`[BunIgniter] Queue worker started on "${queueName}"`);

		const timer = setInterval(async () => {
			if (!Queue.running) return;

			try {
				// 타임아웃 복구
				await Queue.recoverTimeout(queueName);

				// 배치 처리
				for (let i = 0; i < Queue.config.batchSize; i++) {
					const job = await Queue.getDriver().pop(queueName);
					if (!job) break;

					await Queue.processJob(job);
				}
			} catch (err) {
				console.error("[BunIgniter] Queue worker error:", err);
			}
		}, Queue.config.pollInterval);

		Queue.timers.push(timer);
	}

	/**
	 * 워커 정지
	 */
	static stop(): void {
		Queue.running = false;
		for (const timer of Queue.timers) {
			clearInterval(timer);
		}
		Queue.timers = [];
		console.log("[BunIgniter] Queue worker stopped");
	}

	/**
	 * 단일 잡 처리 (수동)
	 */
	static async processJob(job: JobPayload): Promise<boolean> {
		const handler = Queue.handlers.get(job.type);

		if (!handler) {
			console.error(`[BunIgniter] No handler registered for job type: ${job.type}`);
			await Queue.getDriver().fail(job, `No handler for type: ${job.type}`);
			return false;
		}

		try {
			await handler(job.data);
			await Queue.getDriver().complete(job);
			return true;
		} catch (err: any) {
			console.error(`[BunIgniter] Job ${job.id} (${job.type}) failed:`, err.message);
			await Queue.getDriver().fail(job, err.message);
			return false;
		}
	}

	/** 워커 실행 중 여부 */
	static isRunning(): boolean {
		return Queue.running;
	}

	/** 등록된 핸들러 목록 */
	static getRegisteredTypes(): string[] {
		return Array.from(Queue.handlers.keys());
	}
}

/** 싱글톤 */
export const queue = Queue;
