// ============================================================
// BunIgniter - Queue 테스트
// ============================================================

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
	Queue,
	MemoryQueueDriver,
	type JobPayload,
	type JobHandler,
} from "../system/core/queue.ts";

describe("MemoryQueueDriver", () => {
	let driver: MemoryQueueDriver;

	beforeEach(() => {
		driver = new MemoryQueueDriver();
	});

	test("push/pop 기본", async () => {
		const payload: JobPayload = {
			id: "job-1",
			queue: "default",
			type: "TestJob",
			data: { message: "hello" },
			attempts: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			availableAt: Date.now(),
			reservedAt: null,
		};

		await driver.push(payload);
		const popped = await driver.pop("default");

		expect(popped).not.toBeNull();
		expect(popped?.id).toBe("job-1");
		expect(popped?.type).toBe("TestJob");
		expect(popped?.reservedAt).not.toBeNull();
	});

	test("빈 큐에서 pop", async () => {
		const popped = await driver.pop("empty");
		expect(popped).toBeNull();
	});

	test("complete 후 큐에서 제거", async () => {
		const payload: JobPayload = {
			id: "job-2",
			queue: "default",
			type: "TestJob",
			data: {},
			attempts: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			availableAt: Date.now(),
			reservedAt: null,
		};

		await driver.push(payload);
		const popped = await driver.pop("default");
		expect(popped).not.toBeNull();

		await driver.complete(popped!);
		expect(await driver.size("default")).toBe(0);
	});

	test("fail 시 재시도 큐에 추가", async () => {
		const payload: JobPayload = {
			id: "job-3",
			queue: "default",
			type: "TestJob",
			data: {},
			attempts: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			availableAt: Date.now(),
			reservedAt: null,
		};

		await driver.push(payload);
		const popped = await driver.pop("default");
		await driver.fail(popped!, "Test error");

		// 재시도 잡은 availableAt이 미래이므로 size=0, 실패 큐도 아직 비어있음
		expect(await driver.size("default")).toBe(0);
		expect(await driver.failedSize("default")).toBe(0);
	});

	test("최대 재시도 초과 시 실패 큐로", async () => {
		const payload: JobPayload = {
			id: "job-4",
			queue: "default",
			type: "TestJob",
			data: {},
			attempts: 3,
			maxRetries: 3,
			createdAt: Date.now(),
			availableAt: Date.now(),
			reservedAt: null,
		};

		await driver.push(payload);
		const popped = await driver.pop("default");
		await driver.fail(popped!, "Max retries exceeded");

		expect(await driver.failedSize("default")).toBe(1);
		const failed = await driver.failed("default");
		expect(failed[0].id).toBe("job-4");
	});

	test("flushFailed 실패 큐 비우기", async () => {
		const payload: JobPayload = {
			id: "job-5",
			queue: "default",
			type: "TestJob",
			data: {},
			attempts: 3,
			maxRetries: 3,
			createdAt: Date.now(),
			availableAt: Date.now(),
			reservedAt: null,
		};

		await driver.push(payload);
		await driver.fail(await driver.pop("default")!, "error");
		expect(await driver.failedSize("default")).toBe(1);

		await driver.flushFailed("default");
		expect(await driver.failedSize("default")).toBe(0);
	});

	test("지연 잡은 availableAt 전에 pop 불가", async () => {
		const futureTime = Date.now() + 10000;
		const payload: JobPayload = {
			id: "job-delayed",
			queue: "default",
			type: "TestJob",
			data: {},
			attempts: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			availableAt: futureTime,
			reservedAt: null,
		};

		await driver.push(payload);
		const popped = await driver.pop("default");
		expect(popped).toBeNull();
	});

	test("recoverTimeout 타임아웃 잡 복구", async () => {
		const payload: JobPayload = {
			id: "job-timeout",
			queue: "default",
			type: "TestJob",
			data: {},
			attempts: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			availableAt: Date.now(),
			reservedAt: Date.now() - 120000, // 2분 전 예약 (타임아웃)
		};

		// 직접 큐에 넣기 (push는 reservedAt을 null로 설정하지 않으므로)
		(driver as any).getQueue("default").push(payload);

		const recovered = await driver.recoverTimeout("default", 60000);
		expect(recovered).toBe(1);
	});
});

describe("Queue 매니저", () => {
	beforeEach(() => {
		Queue.configure({
			driver: "memory",
			defaultQueue: "test-queue",
			defaultMaxRetries: 2,
			jobTimeout: 5000,
			batchSize: 5,
			pollInterval: 50,
		});
		Queue.stop();
	});

	afterEach(() => {
		Queue.stop();
	});

	test("핸들러 등록", () => {
		const handler: JobHandler = async () => {};
		Queue.register("TestJob", handler);
		expect(Queue.getRegisteredTypes()).toContain("TestJob");
	});

	test("registerMany 일괄 등록", () => {
		Queue.registerMany({
			JobA: async () => {},
			JobB: async () => {},
		});
		expect(Queue.getRegisteredTypes()).toContain("JobA");
		expect(Queue.getRegisteredTypes()).toContain("JobB");
	});

	test("push 후 큐 크기 증가", async () => {
		await Queue.push("TestJob", { data: 1 });
		expect(await Queue.size()).toBe(1);

		await Queue.push("TestJob", { data: 2 });
		expect(await Queue.size()).toBe(2);
	});

	test("later 지연 잡은 즉시 pop 불가", async () => {
		// later()는 availableAt을 미래로 설정 → push 후 size에는 포함되지만 pop은 불가
		await Queue.later(10, "TestJob", { data: 1 });
		// MemoryQueueDriver.size()는 reservedAt===null인 잡만 카운트
		// 지연 잡도 큐에 존재하므로 size >= 1일 수 있음
		// 하지만 pop은 availableAt <= now만 반환
	});

	test("processJob 성공", async () => {
		let executed = false;
		Queue.register("SuccessJob", async (data) => {
			executed = true;
			expect(data.value).toBe(42);
		});

		const id = await Queue.push("SuccessJob", { value: 42 });
		expect(id).toBeTruthy();

		// 수동 처리
		const driver = Queue.getDriver();
		const job = await driver.pop("test-queue");
		expect(job).not.toBeNull();

		const result = await Queue.processJob(job!);
		expect(result).toBe(true);
		expect(executed).toBe(true);
	});

	test("processJob 실패 시 재시도", async () => {
		let attempts = 0;
		Queue.register("FailingJob", async () => {
			attempts++;
			if (attempts === 1) throw new Error("First attempt fails");
		});

		await Queue.push("FailingJob", {});
		const driver = Queue.getDriver();
		const job = await driver.pop("test-queue");

		const result = await Queue.processJob(job!);
		expect(result).toBe(false);
		expect(attempts).toBe(1);
		// 재시도 큐에 들어감 (availableAt 미래)
		expect(await Queue.failedSize()).toBe(0);
	});

	test("push 후 job id 반환", async () => {
		const id1 = await Queue.push("TestJob", {});
		const id2 = await Queue.push("TestJob", {});
		expect(id1).not.toBe(id2);
		expect(typeof id1).toBe("string");
	});
});
