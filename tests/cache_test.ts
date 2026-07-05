// ============================================================
// BunIgniter - Cache Tests
// ============================================================

import { describe, test, expect, beforeEach } from "bun:test";
import { MemoryCacheDriver, Cache } from "../system/core/cache.ts";

// ─── MemoryCacheDriver ─────────────────────────────────

describe("MemoryCacheDriver", () => {
	let driver: MemoryCacheDriver;

	beforeEach(() => {
		driver = new MemoryCacheDriver({ prefix: "test:" });
	});

	test("set/get 기본", () => {
		driver.set("key1", "value1");
		const val = driver.get("key1");
		expect(val).not.toBeNull();
		expect(val).toBe("value1");
	});

	test("get 존재하지 않는 키", () => {
		expect(driver.get("nonexistent")).toBeNull();
	});

	test("has 존재 여부", () => {
		driver.set("key1", "value1");
		expect(driver.has("key1")).toBe(true);
		expect(driver.has("nonexistent")).toBe(false);
	});

	test("forget 삭제", () => {
		driver.set("key1", "value1");
		expect(driver.forget("key1")).toBe(true);
		expect(driver.get("key1")).toBeNull();
	});

	test("pull 조회 후 삭제", () => {
		driver.set("key1", "value1");
		const val = driver.pull("key1");
		expect(val).not.toBeNull();
		expect(val).toBe("value1");
		expect(driver.get("key1")).toBeNull();
	});

	test("flush 전체 삭제", () => {
		driver.set("a", 1);
		driver.set("b", 2);
		driver.flush();
		expect(driver.get("a")).toBeNull();
		expect(driver.get("b")).toBeNull();
	});

	test("TTL 만료", async () => {
		driver.set("expire", "gone", 1);
		expect(driver.has("expire")).toBe(true);
		await new Promise((r) => setTimeout(r, 1100));
		expect(driver.get("expire")).toBeNull();
	});

	test("gc 만료 항목 정리", async () => {
		driver.set("keep", "alive", 10);
		driver.set("expire", "gone", 1);
		await new Promise((r) => setTimeout(r, 1100));
		const removed = driver.gc();
		expect(removed).toBe(1);
		expect(driver.has("keep")).toBe(true);
	});

	test("객체 저장/조회", () => {
		driver.set("user", { id: 1, name: "Alice" });
		const user = driver.get<{ id: number; name: string }>("user");
		expect(user).not.toBeNull();
		expect(user!.name).toBe("Alice");
	});
});

// ─── Cache 매니저 ──────────────────────────────────────

describe("Cache 매니저", () => {
	beforeEach(() => {
		Cache.configure({ driver: "memory", prefix: "mgr:" });
		Cache.flush();
	});

	test("put/get", () => {
		Cache.put("key1", "val1");
		const val = Cache.get("key1");
		expect(val).not.toBeNull();
		expect(val).toBe("val1");
	});

	test("forever 영구 저장", () => {
		Cache.forever("perm", "always");
		const val = Cache.get("perm");
		expect(val).not.toBeNull();
		expect(val).toBe("always");
	});

	test("forget 삭제", () => {
		Cache.put("del", "me");
		expect(Cache.forget("del")).toBe(true);
		expect(Cache.get("del")).toBeNull();
	});

	test("remember 캐시 없음", async () => {
		let called = 0;
		const result = await Cache.remember("compute", 60, async () => {
			called++;
			return "computed";
		});
		expect(result).toBe("computed");
		expect(called).toBe(1);
	});

	test("remember 캐시 적중", async () => {
		Cache.put("compute", "cached");
		let called = 0;
		const result = await Cache.remember("compute", 60, async () => {
			called++;
			return "new";
		});
		expect(result).toBe("cached");
		expect(called).toBe(0);
	});
});
