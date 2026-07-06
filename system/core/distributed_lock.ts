// ============================================================
// BunIgniter - Distributed Lock (Redis)
// Bun 내장 RedisClient 활용
// 스케줄드 잡 분산 잠금
// ============================================================

import { RedisClient } from "bun";

// ─── 분산 잠금 인터페이스 ──────────────────────────────

export interface DistributedLockDriver {
	/** 잠금 획득 (성공 시 true) */
	acquire(key: string, ttlMs: number, owner?: string): Promise<boolean>;
	/** 잠금 연장 */
	renew(key: string, ttlMs: number, owner: string): Promise<boolean>;
	/** 잠금 해제 */
	release(key: string, owner: string): Promise<boolean>;
	/** 잠금 상태 조회 */
	locked(key: string): Promise<boolean>;
	/** 잠금 TTL 조회 (ms) */
	ttl(key: string): Promise<number>;
	/** 모든 잠금 해제 (주의: 테스트용) */
	releaseAll(prefix?: string): Promise<number>;
}

// ─── Redis 분산 잠금 드라이버 ──────────────────────────

/**
 * Redis 기반 분산 잠금 드라이버
 * SET NX EX (원자적 잠금 획득) + Lua 스크립트 (원자적 잠금 해제)
 *
 * Bun 내장 RedisClient.send()로 Lua 스크립트 실행
 */
export class RedisLockDriver implements DistributedLockDriver {
	private client: RedisClient;
	private keyPrefix: string;

	// Lua 스크립트: 소유자 확인 후 원자적 삭제
	private static RELEASE_SCRIPT = `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("del", KEYS[1])
		else
			return 0
		end
	`;

	// Lua 스크립트: 소유자 확인 후 TTL 연장
	private static RENEW_SCRIPT = `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("pexpire", KEYS[1], ARGV[2])
		else
			return 0
		end
	`;

	constructor(options?: { redisUrl?: string; keyPrefix?: string }) {
		const url = options?.redisUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379";
		this.keyPrefix = options?.keyPrefix ?? "bunigniter:lock:";
		this.client = new RedisClient(url, {
			autoReconnect: true,
			maxRetries: 10,
			enableOfflineQueue: true,
		});
	}

	async acquire(key: string, ttlMs: number, owner?: string): Promise<boolean> {
		const redisKey = `${this.keyPrefix}${key}`;
		const lockOwner = owner ?? crypto.randomUUID();
		const ttlSec = Math.ceil(ttlMs / 1000);

		// SET key value NX EX ttl (원자적 잠금 획득)
		const result = await this.client.send("SET", [
			redisKey,
			lockOwner,
			"NX",
			"EX",
			ttlSec.toString(),
		]);

		return result === "OK";
	}

	async renew(key: string, ttlMs: number, owner: string): Promise<boolean> {
		const redisKey = `${this.keyPrefix}${key}`;

		// Lua 스크립트로 원자적 소유자 확인 + TTL 연장
		const result = await this.client.send("EVAL", [
			RedisLockDriver.RENEW_SCRIPT,
			"1",
			redisKey,
			owner,
			ttlMs.toString(),
		]);

		return Number(result) === 1;
	}

	async release(key: string, owner: string): Promise<boolean> {
		const redisKey = `${this.keyPrefix}${key}`;

		// Lua 스크립트로 원자적 소유자 확인 + 삭제
		const result = await this.client.send("EVAL", [
			RedisLockDriver.RELEASE_SCRIPT,
			"1",
			redisKey,
			owner,
		]);

		return Number(result) === 1;
	}

	async locked(key: string): Promise<boolean> {
		const redisKey = `${this.keyPrefix}${key}`;
		const exists = await this.client.exists(redisKey);
		return exists === true;
	}

	async ttl(key: string): Promise<number> {
		const redisKey = `${this.keyPrefix}${key}`;
		const ttlMs = await this.client.send("PTTL", [redisKey]);
		return Number(ttlMs);
	}

	async releaseAll(prefix?: string): Promise<number> {
		const pattern = `${this.keyPrefix}${prefix ?? ""}*`;
		let count = 0;

		// SCAN으로 키 찾기 (대량 키 안전 처리)
		let cursor = "0";
		do {
			const result = await this.client.send("SCAN", [cursor, "MATCH", pattern, "COUNT", "100"]);

			const [nextCursor, keys] = result as [string, string[]];
			cursor = nextCursor;

			if (keys && keys.length > 0) {
				await this.client.del(...keys);
				count += keys.length;
			}
		} while (cursor !== "0");

		return count;
	}

	/** Redis 연결 종료 */
	close(): void {
		this.client.close();
	}
}

// ─── 메모리 분산 잠금 드라이버 (개발/테스트용) ──────────

export class MemoryLockDriver implements DistributedLockDriver {
	private locks: Map<string, { owner: string; expiresAt: number }> = new Map();

	async acquire(key: string, ttlMs: number, owner?: string): Promise<boolean> {
		this.cleanup();

		const lockOwner = owner ?? crypto.randomUUID();
		const existing = this.locks.get(key);

		// 이미 잠금이 있고 만료되지 않았으면 실패
		if (existing && existing.expiresAt > Date.now()) {
			return false;
		}

		this.locks.set(key, {
			owner: lockOwner,
			expiresAt: Date.now() + ttlMs,
		});
		return true;
	}

	async renew(key: string, ttlMs: number, owner: string): Promise<boolean> {
		this.cleanup();

		const existing = this.locks.get(key);
		if (!existing || existing.owner !== owner) {
			return false;
		}

		existing.expiresAt = Date.now() + ttlMs;
		return true;
	}

	async release(key: string, owner: string): Promise<boolean> {
		const existing = this.locks.get(key);
		if (!existing || existing.owner !== owner) {
			return false;
		}

		this.locks.delete(key);
		return true;
	}

	async locked(key: string): Promise<boolean> {
		this.cleanup();
		const existing = this.locks.get(key);
		return existing !== undefined && existing.expiresAt > Date.now();
	}

	async ttl(key: string): Promise<number> {
		this.cleanup();
		const existing = this.locks.get(key);
		if (!existing) return -2;
		if (existing.expiresAt <= Date.now()) return -1;
		return existing.expiresAt - Date.now();
	}

	async releaseAll(prefix?: string): Promise<number> {
		let count = 0;
		for (const [key] of this.locks) {
			if (!prefix || key.includes(prefix)) {
				this.locks.delete(key);
				count++;
			}
		}
		return count;
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, lock] of this.locks) {
			if (lock.expiresAt <= now) {
				this.locks.delete(key);
			}
		}
	}
}

// ─── DistributedLock 매니저 ────────────────────────────

export interface DistributedLockConfig {
	/** 드라이버: "memory" | "redis" */
	driver: string;
	/** Redis URL */
	redisUrl: string;
	/** 잠금 키 접두사 */
	keyPrefix: string;
	/** 기본 TTL (ms) */
	defaultTtl: number;
	/** 잠금 획득 재시도 간격 (ms) */
	retryInterval: number;
	/** 잠금 획득 최대 재시도 */
	maxRetries: number;
}

const DEFAULT_LOCK_CONFIG: DistributedLockConfig = {
	driver: "memory",
	redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
	keyPrefix: "bunigniter:lock:",
	defaultTtl: 60000,
	retryInterval: 200,
	maxRetries: 50,
};

/**
 * 분산 잠금 매니저
 *
 * 사용법:
 *   import { DistributedLock } from "system/core/distributed_lock.ts";
 *
 *   // 설정
 *   DistributedLock.configure({ driver: "redis" });
 *
 *   // 잠금 획득
 *   const lock = await DistributedLock.acquire("cron:cleanup");
 *   if (lock.acquired) {
 *     try {
 *       await doWork();
 *     } finally {
 *       await DistributedLock.release(lock);
 *     }
 *   }
 *
 *   // 래퍼 패턴
 *   await DistributedLock.run("cron:report", async () => {
 *     await generateReport();
 *   });
 */
export class DistributedLock {
	private static driver: DistributedLockDriver | null = null;
	private static config: DistributedLockConfig = DEFAULT_LOCK_CONFIG;

	/** 설정 */
	static configure(config: Partial<DistributedLockConfig>): void {
		DistributedLock.config = { ...DEFAULT_LOCK_CONFIG, ...config };
		DistributedLock.driver = null;
	}

	/** 드라이버 가져오기 */
	static getDriver(): DistributedLockDriver {
		if (!DistributedLock.driver) {
			switch (DistributedLock.config.driver) {
				case "redis":
					DistributedLock.driver = new RedisLockDriver({
						redisUrl: DistributedLock.config.redisUrl,
						keyPrefix: DistributedLock.config.keyPrefix,
					});
					break;
				default:
					DistributedLock.driver = new MemoryLockDriver();
					break;
			}
		}
		return DistributedLock.driver!;
	}

	/**
	 * 잠금 획득
	 * @returns 잠금 정보 (acquired, key, owner, ttl)
	 */
	static async acquire(
		key: string,
		ttlMs?: number,
	): Promise<{
		acquired: boolean;
		key: string;
		owner: string;
		ttl: number;
	}> {
		const owner = crypto.randomUUID();
		const ttl = ttlMs ?? DistributedLock.config.defaultTtl;
		const acquired = await DistributedLock.getDriver().acquire(key, ttl, owner);

		return { acquired, key, owner, ttl };
	}

	/**
	 * 잠금 해제
	 */
	static async release(lock: { key: string; owner: string }): Promise<boolean> {
		return DistributedLock.getDriver().release(lock.key, lock.owner);
	}

	/**
	 * 잠금 연장
	 */
	static async renew(lock: { key: string; owner: string }, ttlMs?: number): Promise<boolean> {
		const ttl = ttlMs ?? DistributedLock.config.defaultTtl;
		return DistributedLock.getDriver().renew(lock.key, ttl, lock.owner);
	}

	/**
	 * 잠금 상태 조회
	 */
	static async isLocked(key: string): Promise<boolean> {
		return DistributedLock.getDriver().locked(key);
	}

	/**
	 * 잠금 TTL 조회
	 */
	static async getTtl(key: string): Promise<number> {
		return DistributedLock.getDriver().ttl(key);
	}

	/**
	 * 재시도와 함께 잠금 획득
	 */
	static async acquireWithRetry(
		key: string,
		ttlMs?: number,
		options?: {
			retryInterval?: number;
			maxRetries?: number;
		},
	): Promise<{
		acquired: boolean;
		key: string;
		owner: string;
		ttl: number;
		attempts: number;
	}> {
		const retryInterval = options?.retryInterval ?? DistributedLock.config.retryInterval;
		const maxRetries = options?.maxRetries ?? DistributedLock.config.maxRetries;
		const owner = crypto.randomUUID();
		const ttl = ttlMs ?? DistributedLock.config.defaultTtl;

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			const acquired = await DistributedLock.getDriver().acquire(key, ttl, owner);
			if (acquired) {
				return { acquired: true, key, owner, ttl, attempts: attempt + 1 };
			}

			// 재시도 대기
			await new Promise((resolve) => setTimeout(resolve, retryInterval));
		}

		return { acquired: false, key, owner, ttl, attempts: maxRetries };
	}

	/**
	 * 래퍼 패턴: 잠금 획득 → 작업 → 잠금 해제
	 *
	 * 사용법:
	 *   await DistributedLock.run("cron:cleanup", async () => {
	 *     await cleanupTempFiles();
	 *   });
	 */
	static async run<T>(
		key: string,
		callback: () => Promise<T>,
		options?: {
			ttlMs?: number;
			retryInterval?: number;
			maxRetries?: number;
			autoRenew?: boolean;
		},
	): Promise<{ executed: boolean; result?: T; error?: string }> {
		const lock = await DistributedLock.acquireWithRetry(key, options?.ttlMs, {
			retryInterval: options?.retryInterval,
			maxRetries: options?.maxRetries,
		});

		if (!lock.acquired) {
			return { executed: false, error: "Failed to acquire lock" };
		}

		// 자동 잠금 연장 타이머
		let renewTimer: ReturnType<typeof setInterval> | null = null;
		if (options?.autoRenew) {
			const renewInterval = Math.floor(lock.ttl / 3);
			renewTimer = setInterval(() => {
				DistributedLock.renew(lock, lock.ttl).catch(() => {});
			}, renewInterval);
		}

		try {
			const result = await callback();
			return { executed: true, result };
		} catch (err: any) {
			return { executed: true, error: err.message };
		} finally {
			if (renewTimer) clearInterval(renewTimer);
			await DistributedLock.release(lock);
		}
	}

	/**
	 * 스케줄드 잡용 잠금 래퍼
	 * 동일한 크론 잡이 여러 서버에서 동시에 실행되지 않도록 보장
	 *
	 * 사용법:
	 *   Scheduler.add("cleanup", "0 * * * *", () => {
	 *     return DistributedLock.runScheduled("cleanup", async () => {
	 *       await cleanupTempFiles();
	 *     });
	 *   });
	 */
	static async runScheduled<T>(
		jobName: string,
		callback: () => Promise<T>,
		options?: {
			ttlMs?: number;
		},
	): Promise<{ executed: boolean; result?: T; error?: string }> {
		const lockKey = `scheduled:${jobName}`;
		const ttl = options?.ttlMs ?? 300000; // 기본 5분 (크론 잡 최대 실행 시간)

		return DistributedLock.run(lockKey, callback, {
			ttlMs: ttl,
			maxRetries: 1, // 크론 잡은 재시도 1회만 (다른 서버가 잡고 있으면 스킵)
			autoRenew: true, // 장시간 실행 잡 자동 연장
		});
	}

	/**
	 * 모든 잠금 해제 (테스트/관리용)
	 */
	static async releaseAll(prefix?: string): Promise<number> {
		return DistributedLock.getDriver().releaseAll(prefix);
	}
}

/** 싱글톤 */
export const distributedLock = DistributedLock;
