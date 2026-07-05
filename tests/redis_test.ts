// ============================================================
// BunIgniter - Redis Session 테스트 (인터페이스/타입 검증)
// 실제 Redis 연결 없이 클래스 구조 검증
// ============================================================

import { describe, test, expect } from "bun:test";
import { RedisSession } from "../system/core/redis_session.ts";
import { RedisCacheDriver } from "../system/core/redis_cache.ts";
import type { SessionDriver } from "../system/core/session_driver.ts";
import type { CacheDriver } from "../system/core/cache.ts";

describe("RedisSession 구조 검증", () => {
	test("SessionDriver 인터페이스 구현", () => {
		const request = new Request("http://localhost", {
			headers: { cookie: "bunigniter_session=test-id" },
		});
		const session = new RedisSession(request, {
			redisUrl: "redis://localhost:6379",
		});

		// SessionDriver 인터페이스 메서드 존재 확인
		expect(typeof session.set).toBe("function");
		expect(typeof session.get).toBe("function");
		expect(typeof session.has).toBe("function");
		expect(typeof session.remove).toBe("function");
		expect(typeof session.all).toBe("function");
		expect(typeof session.flash).toBe("function");
		expect(typeof session.getFlash).toBe("function");
		expect(typeof session.getId).toBe("function");
		expect(typeof session.save).toBe("function");
		expect(typeof session.destroy).toBe("function");
		expect(typeof session.getCookieHeader).toBe("function");
		expect(typeof session.load).toBe("function");
		expect(typeof session.saveAsync).toBe("function");
		expect(typeof session.destroyAsync).toBe("function");
		expect(typeof session.getCookieHeaderAsync).toBe("function");
	});

	test("쿠키에서 세션 ID 읽기", () => {
		const request = new Request("http://localhost", {
			headers: { cookie: "bunigniter_session=existing-session-id" },
		});
		const session = new RedisSession(request);

		expect(session.getId()).toBe("existing-session-id");
	});

	test("세션 ID가 없으면 새 ID 생성", () => {
		const request = new Request("http://localhost");
		const session = new RedisSession(request);

		const id = session.getId();
		expect(id).toBeTruthy();
		expect(id.length).toBeGreaterThan(0);
		expect(id).not.toBe("undefined");
	});

	test("set/get 동작 (Redis 저장 전 메모리)", () => {
		const request = new Request("http://localhost");
		const session = new RedisSession(request);

		session.set("userId", 42);
		session.set("name", "Alice");

		expect(session.get("userId")).toBe(42);
		expect(session.get("name")).toBe("Alice");
		expect(session.has("userId")).toBe(true);
		expect(session.has("nonexistent")).toBe(false);
	});

	test("remove 동작", () => {
		const request = new Request("http://localhost");
		const session = new RedisSession(request);

		session.set("key", "value");
		expect(session.has("key")).toBe(true);

		session.remove("key");
		expect(session.has("key")).toBe(false);
		expect(session.get("key")).toBeUndefined();
	});

	test("all 전체 데이터", () => {
		const request = new Request("http://localhost");
		const session = new RedisSession(request);

		session.set("a", 1);
		session.set("b", 2);

		const all = session.all();
		expect(all.a).toBe(1);
		expect(all.b).toBe(2);
	});

	test("flash/getFlash 1회성 데이터", () => {
		const request = new Request("http://localhost");
		const session = new RedisSession(request);

		session.flash("message", "저장되었습니다");
		expect(session.getFlash("message")).toBe("저장되었습니다");

		// 두 번째 조회 시 undefined
		expect(session.getFlash("message")).toBeUndefined();
	});

	test("getCookieHeader 형식", () => {
		const request = new Request("http://localhost");
		const session = new RedisSession(request, { expiration: 3600 });

		const header = session.getCookieHeader();
		expect(header).toContain("bunigniter_session=");
		expect(header).toContain("Path=/");
		expect(header).toContain("HttpOnly");
		expect(header).toContain("Max-Age=3600");
	});

	test("커스텀 쿠키명", () => {
		const request = new Request("http://localhost");
		const session = new RedisSession(request, { cookieName: "custom_session" });

		const header = session.getCookieHeader();
		expect(header).toContain("custom_session=");
	});

	test("정적 메서드 존재", () => {
		expect(typeof RedisSession.getClient).toBe("function");
		expect(typeof RedisSession.gc).toBe("function");
		expect(typeof RedisSession.count).toBe("function");
		expect(typeof RedisSession.flush).toBe("function");
		expect(typeof RedisSession.closeAll).toBe("function");
	});

	test("SessionDriver 타입 호환성", () => {
		const request = new Request("http://localhost");
		const session: SessionDriver = new RedisSession(request);

		expect(session).toBeDefined();
		expect(typeof session.set).toBe("function");
	});
});

describe("RedisCacheDriver 구조 검증", () => {
	test("CacheDriver 인터페이스 구현", () => {
		const driver = new RedisCacheDriver({ redisUrl: "redis://localhost:6379" });

		// CacheDriver 인터페이스 메서드 존재 확인
		expect(typeof driver.set).toBe("function");
		expect(typeof driver.get).toBe("function");
		expect(typeof driver.has).toBe("function");
		expect(typeof driver.forget).toBe("function");
		expect(typeof driver.pull).toBe("function");
		expect(typeof driver.flush).toBe("function");
		expect(typeof driver.gc).toBe("function");
		expect(typeof driver.size).toBe("function");
	});

	test("정적 메서드 존재", () => {
		expect(typeof RedisCacheDriver.getClient).toBe("function");
		expect(typeof RedisCacheDriver.closeAll).toBe("function");
	});

	test("CacheDriver 타입 호환성", () => {
		const driver: CacheDriver = new RedisCacheDriver({
			redisUrl: "redis://localhost:6379",
		});

		expect(driver).toBeDefined();
		expect(typeof driver.set).toBe("function");
	});

	test("커스텀 keyPrefix", () => {
		const driver = new RedisCacheDriver({
			redisUrl: "redis://localhost:6379",
			keyPrefix: "custom:cache:",
		});

		expect(driver).toBeDefined();
	});
});
