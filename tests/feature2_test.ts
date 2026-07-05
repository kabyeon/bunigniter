// ============================================================
// BunIgniter - Worker Pool, Distributed Lock, Audit Log UI 테스트
// ============================================================

import { describe, test, expect, beforeEach } from "bun:test";
import { WorkerPool, resetWorkerPool } from "../system/core/worker_pool.ts";
import { DistributedLock, MemoryLockDriver, RedisLockDriver } from "../system/core/distributed_lock.ts";
import { auditLogHtml, createAuditLogRoutes } from "../system/core/audit_log_ui.ts";
import type { AuditLogEntry } from "../system/core/audit_log.ts";

// ─── WorkerPool 테스트 ──────────────────────────────────

describe("WorkerPool", () => {
	beforeEach(() => {
		resetWorkerPool();
	});

	test("WorkerPool 인스턴스 생성", () => {
		const pool = new WorkerPool({ concurrency: 2 });
		expect(pool).toBeDefined();
		expect(pool.isRunning()).toBe(false);
	});

	test("WorkerPool 상태 조회 (시작 전)", () => {
		const pool = new WorkerPool({ concurrency: 2 });
		const status = pool.status();
		expect(status.started).toBe(false);
		expect(status.totalWorkers).toBe(0);
	});

	test("WorkerPool 이벤트 리스너 설정", () => {
		const pool = new WorkerPool({ concurrency: 2 });
		let called = false;
		pool.on("onWorkerReady", () => { called = true; });
		// 이벤트 핸들러 등록 확인
		expect(called).toBe(false); // 아직 호출되지 않음
	});

	test("WorkerPool 워커 수 조회", () => {
		const pool = new WorkerPool({ concurrency: 4 });
		expect(pool.getWorkerCount()).toBe(0);
	});

	test("WorkerPool 대기 잡 수 조회", () => {
		const pool = new WorkerPool({ concurrency: 2 });
		expect(pool.getPendingCount()).toBe(0);
	});

	test("WorkerPool config 기본값", () => {
		const pool = new WorkerPool();
		const status = pool.status();
		expect(status.started).toBe(false);
	});

	test("WorkerPool dispatch (시작 전)", () => {
		const pool = new WorkerPool({ concurrency: 2 });
		const result = pool.dispatch({
			id: "test-1",
			queue: "default",
			type: "TestJob",
			data: {},
			attempts: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			availableAt: Date.now(),
			reservedAt: null,
		});
		// 워커가 시작되지 않았으므로 대기 큐에 들어감
		expect(result).toBe(false);
		expect(pool.getPendingCount()).toBe(1);
	});

	test("WorkerPool 정지 (시작하지 않은 경우)", async () => {
		const pool = new WorkerPool({ concurrency: 2 });
		await pool.stop(); // 에러 없이 완료
		expect(pool.isRunning()).toBe(false);
	});
});

// ─── MemoryLockDriver 테스트 ────────────────────────────

describe("MemoryLockDriver", () => {
	let driver: MemoryLockDriver;

	beforeEach(() => {
		driver = new MemoryLockDriver();
	});

	test("잠금 획득", async () => {
		const result = await driver.acquire("test-key", 5000, "owner-1");
		expect(result).toBe(true);
	});

	test("중복 잠금 획득 실패", async () => {
		await driver.acquire("test-key", 5000, "owner-1");
		const result = await driver.acquire("test-key", 5000, "owner-2");
		expect(result).toBe(false);
	});

	test("잠금 해제 후 재획득", async () => {
		await driver.acquire("test-key", 5000, "owner-1");
		await driver.release("test-key", "owner-1");
		const result = await driver.acquire("test-key", 5000, "owner-2");
		expect(result).toBe(true);
	});

	test("다른 소유자 해제 실패", async () => {
		await driver.acquire("test-key", 5000, "owner-1");
		const result = await driver.release("test-key", "owner-2");
		expect(result).toBe(false);
	});

	test("잠금 상태 조회", async () => {
		expect(await driver.locked("test-key")).toBe(false);
		await driver.acquire("test-key", 5000, "owner-1");
		expect(await driver.locked("test-key")).toBe(true);
	});

	test("TTL 조회", async () => {
		await driver.acquire("test-key", 10000, "owner-1");
		const ttl = await driver.ttl("test-key");
		expect(ttl).toBeGreaterThan(0);
		expect(ttl).toBeLessThanOrEqual(10000);
	});

	test("존재하지 않는 키 TTL", async () => {
		const ttl = await driver.ttl("nonexistent");
		expect(ttl).toBe(-2);
	});

	test("잠금 연장", async () => {
		await driver.acquire("test-key", 5000, "owner-1");
		const result = await driver.renew("test-key", 10000, "owner-1");
		expect(result).toBe(true);
		const ttl = await driver.ttl("test-key");
		expect(ttl).toBeGreaterThan(5000);
	});

	test("다른 소유자 연장 실패", async () => {
		await driver.acquire("test-key", 5000, "owner-1");
		const result = await driver.renew("test-key", 10000, "owner-2");
		expect(result).toBe(false);
	});

	test("전체 잠금 해제", async () => {
		await driver.acquire("key-1", 5000, "owner-1");
		await driver.acquire("key-2", 5000, "owner-1");
		const count = await driver.releaseAll();
		expect(count).toBe(2);
		expect(await driver.locked("key-1")).toBe(false);
		expect(await driver.locked("key-2")).toBe(false);
	});

	test("접두사 잠금 해제", async () => {
		await driver.acquire("cron:job-1", 5000, "owner-1");
		await driver.acquire("cron:job-2", 5000, "owner-1");
		await driver.acquire("session:abc", 5000, "owner-1");
		const count = await driver.releaseAll("cron");
		expect(count).toBe(2);
		expect(await driver.locked("session:abc")).toBe(true);
	});

	test("만료된 잠금 자동 정리", async () => {
		await driver.acquire("test-key", 1, "owner-1"); // 1ms TTL
		// 잠시 대기 후 만료
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(await driver.locked("test-key")).toBe(false);
		// 만료 후 재획득 가능
		const result = await driver.acquire("test-key", 5000, "owner-2");
		expect(result).toBe(true);
	});
});

// ─── DistributedLock 매니저 테스트 ──────────────────────

describe("DistributedLock", () => {
	beforeEach(() => {
		DistributedLock.configure({ driver: "memory" });
	});

	test("잠금 획득", async () => {
		const lock = await DistributedLock.acquire("test-key");
		expect(lock.acquired).toBe(true);
		expect(lock.owner).toBeDefined();
		expect(lock.key).toBe("test-key");
	});

	test("중복 잠금 획득 실패", async () => {
		const lock1 = await DistributedLock.acquire("test-key");
		expect(lock1.acquired).toBe(true);

		const lock2 = await DistributedLock.acquire("test-key");
		expect(lock2.acquired).toBe(false);
	});

	test("잠금 해제 후 재획득", async () => {
		const lock = await DistributedLock.acquire("test-key");
		await DistributedLock.release(lock);

		const lock2 = await DistributedLock.acquire("test-key");
		expect(lock2.acquired).toBe(true);
	});

	test("잠금 상태 조회", async () => {
		expect(await DistributedLock.isLocked("test-key")).toBe(false);
		await DistributedLock.acquire("test-key");
		expect(await DistributedLock.isLocked("test-key")).toBe(true);
	});

	test("run 래퍼 - 성공", async () => {
		const result = await DistributedLock.run("test-key", async () => {
			return 42;
		});
		expect(result.executed).toBe(true);
		expect(result.result).toBe(42);
		// 잠금 해제 확인
		expect(await DistributedLock.isLocked("test-key")).toBe(false);
	});

	test("run 래퍼 - 잠금 획득 실패", async () => {
		await DistributedLock.acquire("test-key");

		const result = await DistributedLock.run("test-key", async () => {
			return 42;
		}, { maxRetries: 1 });
		expect(result.executed).toBe(false);
		expect(result.error).toBeDefined();
	});

	test("run 래퍼 - 콜백 에러", async () => {
		const result = await DistributedLock.run("test-key", async () => {
			throw new Error("Test error");
		});
		expect(result.executed).toBe(true);
		expect(result.error).toBe("Test error");
		// 잠금 해제 확인
		expect(await DistributedLock.isLocked("test-key")).toBe(false);
	});

	test("acquireWithRetry", async () => {
		// 즉시 획득 가능
		const lock = await DistributedLock.acquireWithRetry("test-key", 5000, {
			retryInterval: 10,
			maxRetries: 5,
		});
		expect(lock.acquired).toBe(true);
		expect(lock.attempts).toBe(1);
	});

	test("acquireWithRetry - 재시도 후 실패", async () => {
		await DistributedLock.acquire("test-key", 30000);

		const lock = await DistributedLock.acquireWithRetry("test-key", 5000, {
			retryInterval: 10,
			maxRetries: 3,
		});
		expect(lock.acquired).toBe(false);
		expect(lock.attempts).toBe(3);
	});

	test("runScheduled - 크론 잡 분산 잠금", async () => {
		const result = await DistributedLock.runScheduled("cleanup", async () => {
			return "done";
		});
		expect(result.executed).toBe(true);
		expect(result.result).toBe("done");
	});

	test("runScheduled - 다른 서버가 잡고 있으면 스킵", async () => {
		// runScheduled은 "scheduled:report" 키를 사용
		await DistributedLock.acquire("scheduled:report", 30000);

		const result = await DistributedLock.runScheduled("report", async () => {
			return "done";
		});
		expect(result.executed).toBe(false);
	});

	test("전체 잠금 해제", async () => {
		await DistributedLock.acquire("key-1");
		await DistributedLock.acquire("key-2");
		const count = await DistributedLock.releaseAll();
		expect(count).toBe(2);
	});
});

// ─── RedisLockDriver 구조 테스트 ───────────────────────

describe("RedisLockDriver (구조)", () => {
	test("인스턴스 생성", () => {
		const driver = new RedisLockDriver({ redisUrl: "redis://localhost:6379" });
		expect(driver).toBeDefined();
	});

	test("close 메서드 존재", () => {
		const driver = new RedisLockDriver();
		expect(typeof driver.close).toBe("function");
	});
});

// ─── Audit Log UI 테스트 ───────────────────────────────

describe("Audit Log UI", () => {
	test("auditLogHtml - 빈 엔트리", () => {
		const html = auditLogHtml([], 0, 1, 25, {}, {
			basePath: "/_audit",
			perPage: 25,
			enableSSE: false,
		});
		expect(html).toContain("Audit Log");
		expect(html).toContain("No audit log entries found");
	});

	test("auditLogHtml - 엔트리 포함", () => {
		const entries: AuditLogEntry[] = [
			{
				id: 1,
				event: "create",
				entity_type: "posts",
				entity_id: "42",
				old_values: null,
				new_values: '{"title":"Hello"}',
				user_id: 1,
				ip_address: "127.0.0.1",
				description: null,
				created_at: "2025-01-01T00:00:00Z",
			},
		];

		const html = auditLogHtml(entries, 1, 1, 25, {}, {
			basePath: "/_audit",
			perPage: 25,
			enableSSE: false,
		});
		expect(html).toContain("posts:42");
		expect(html).toContain("badge-create");
		expect(html).toContain("127.0.0.1");
	});

	test("auditLogHtml - 필터 포함", () => {
		const html = auditLogHtml([], 0, 1, 25, {
			event: "create",
			entityType: "posts",
		}, {
			basePath: "/_audit",
			perPage: 25,
			enableSSE: false,
		});
		expect(html).toContain("selected");
	});

	test("auditLogHtml - SSE 활성화", () => {
		const html = auditLogHtml([], 0, 1, 25, {}, {
			basePath: "/_audit",
			perPage: 25,
			enableSSE: true,
		});
		expect(html).toContain("Live");
		expect(html).toContain("EventSource");
	});

	test("auditLogHtml - 대시보드 링크", () => {
		const html = auditLogHtml([], 0, 1, 25, {}, {
			basePath: "/_audit",
			perPage: 25,
			enableSSE: false,
			dashboardPath: "/_dashboard",
		});
		expect(html).toContain("/_dashboard");
	});

	test("createAuditLogRoutes - 라우트 생성", () => {
		const routes = createAuditLogRoutes();
		expect(routes.length).toBeGreaterThan(0);
		expect(routes[0].method).toBe("GET");
		expect(routes[0].path).toContain("/_audit");
	});

	test("createAuditLogRoutes - 커스텀 basePath", () => {
		const routes = createAuditLogRoutes({ basePath: "/admin/audit" });
		expect(routes[0].path).toBe("/admin/audit");
	});

	test("createAuditLogRoutes - SSE 라우트 포함", () => {
		const routes = createAuditLogRoutes({ enableSSE: true });
		const sseRoute = routes.find((r) => r.path.includes("/stream"));
		expect(sseRoute).toBeDefined();
	});

	test("createAuditLogRoutes - API 라우트 포함", () => {
		const routes = createAuditLogRoutes();
		const apiRoutes = routes.filter((r) => r.path.includes("/api"));
		expect(apiRoutes.length).toBeGreaterThanOrEqual(3);
	});
});
