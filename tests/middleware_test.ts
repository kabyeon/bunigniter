// ============================================================
// BunIgniter - CORS & Rate Limit Tests
// ============================================================

import { beforeEach, describe, expect, test } from "bun:test";
import { corsMiddleware, createCorsMiddleware } from "../system/core/cors.ts";
import {
	cleanupRateLimitStore,
	createRateLimitMiddleware,
	rateLimitMiddleware,
	resetRateLimitStore,
} from "../system/core/rate_limit.ts";

// ─── CORS ──────────────────────────────────────────────

describe("CORS 미들웨어", () => {
	const mockNext = async () => new Response("ok");

	test("기본 CORS 헤더 추가", async () => {
		const req = new Request("http://localhost/test", {
			headers: { origin: "http://example.com" },
		});
		const result = await corsMiddleware({
			request: req,
			response: {} as any,
			next: mockNext,
		});
		expect(result).toBeInstanceOf(Response);
		const origin = (result as Response).headers.get("Access-Control-Allow-Origin");
		expect(origin).toBeTruthy();
	});

	test("Preflight OPTIONS 요청", async () => {
		const req = new Request("http://localhost/test", { method: "OPTIONS" });
		const result = await corsMiddleware({
			request: req,
			response: {} as any,
			next: mockNext,
		});
		expect((result as Response).status).toBe(204);
		expect((result as Response).headers.get("Access-Control-Allow-Methods")).toBeTruthy();
	});

	test("커스텀 오리진 설정", async () => {
		const customCors = createCorsMiddleware({
			origin: ["http://allowed.com"],
			credentials: true,
		});
		const req = new Request("http://localhost/test", {
			headers: { origin: "http://allowed.com" },
		});
		const result = await customCors({
			request: req,
			response: {} as any,
			next: mockNext,
		});
		expect((result as Response).headers.get("Access-Control-Allow-Origin")).toBe(
			"http://allowed.com",
		);
		expect((result as Response).headers.get("Access-Control-Allow-Credentials")).toBe("true");
	});
});

// ─── Rate Limit ────────────────────────────────────────

describe("Rate Limit 미들웨어", () => {
	beforeEach(() => {
		resetRateLimitStore();
	});

	const mockNext = async () => new Response("ok");

	test("정상 요청 통과", async () => {
		const req = new Request("http://localhost/test");
		const result = await rateLimitMiddleware({
			request: req,
			response: {} as any,
			next: mockNext,
		});
		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(200);
	});

	test("Rate Limit 헤더 포함", async () => {
		const req = new Request("http://localhost/test");
		const result = await rateLimitMiddleware({
			request: req,
			response: {} as any,
			next: mockNext,
		});
		expect((result as Response).headers.get("X-RateLimit-Limit")).toBeTruthy();
		expect((result as Response).headers.get("X-RateLimit-Remaining")).toBeTruthy();
	});

	test("요청 제한 초과 시 429", async () => {
		const limiter = createRateLimitMiddleware({
			windowMs: 60,
			maxRequests: 2,
		});

		const req = new Request("http://localhost/test");

		await limiter({ request: req, response: {} as any, next: mockNext });
		await limiter({ request: req, response: {} as any, next: mockNext });

		const result = await limiter({
			request: req,
			response: {} as any,
			next: mockNext,
		});
		expect((result as Response).status).toBe(429);
	});

	test("cleanupRateLimitStore 동작", () => {
		const removed = cleanupRateLimitStore();
		expect(typeof removed).toBe("number");
	});
});
