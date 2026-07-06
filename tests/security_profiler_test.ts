// ============================================================
// Security Headers + User Agent + Profiler 테스트
// ============================================================

import { describe, expect, test } from "bun:test";
import { Profiler } from "../system/core/profiler.ts";
import {
	createSecurityHeadersMiddleware,
	securityHeadersMiddleware,
} from "../system/core/security_headers.ts";
import { UserAgent } from "../system/core/user_agent.ts";

// ─── Security Headers ──────────────────────────────────

describe("Security Headers 미들웨어", () => {
	test("기본 보안 헤더 적용", async () => {
		const mw = createSecurityHeadersMiddleware();
		const result = await mw({
			request: new Request("http://localhost/test"),
			response: {
				status: (code: number) => ({ status: code }),
				redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
				json: (data: any) =>
					new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } }),
				send: (body: string) => new Response(body),
				headers: (h: Record<string, string>) => ({ headers: h }),
			},
			next: async () => new Response("OK"),
		});

		expect(result).toBeInstanceOf(Response);
		expect(result!.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(result!.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
		expect(result!.headers.get("X-XSS-Protection")).toBe("1; mode=block");
		expect(result!.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
	});

	test("X-Powered-By 헤더 제거", async () => {
		const mw = createSecurityHeadersMiddleware();
		const result = await mw({
			request: new Request("http://localhost/test"),
			response: {
				status: (code: number) => ({ status: code }),
				redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
				json: (data: any) =>
					new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } }),
				send: (body: string) => new Response(body),
				headers: (h: Record<string, string>) => ({ headers: h }),
			},
			next: async () => {
				const res = new Response("OK");
				res.headers.set("X-Powered-By", "Express");
				res.headers.set("Server", "nginx");
				return res;
			},
		});

		expect(result!.headers.get("X-Powered-By")).toBeNull();
		expect(result!.headers.get("Server")).toBeNull();
	});

	test("커스텀 HSTS 설정", async () => {
		const mw = createSecurityHeadersMiddleware({
			hsts: "max-age=31536000; includeSubDomains",
		});
		const result = await mw({
			request: new Request("http://localhost/test"),
			response: {
				status: (code: number) => ({ status: code }),
				redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
				json: (data: any) =>
					new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } }),
				send: (body: string) => new Response(body),
				headers: (h: Record<string, string>) => ({ headers: h }),
			},
			next: async () => new Response("OK"),
		});

		expect(result!.headers.get("Strict-Transport-Security")).toBe(
			"max-age=31536000; includeSubDomains",
		);
	});

	test("CSP 설정", async () => {
		const mw = createSecurityHeadersMiddleware({
			csp: "default-src 'self'; script-src 'self'",
		});
		const result = await mw({
			request: new Request("http://localhost/test"),
			response: {
				status: (code: number) => ({ status: code }),
				redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
				json: (data: any) =>
					new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } }),
				send: (body: string) => new Response(body),
				headers: (h: Record<string, string>) => ({ headers: h }),
			},
			next: async () => new Response("OK"),
		});

		expect(result!.headers.get("Content-Security-Policy")).toBe(
			"default-src 'self'; script-src 'self'",
		);
	});

	test("특정 헤더 비활성화", async () => {
		const mw = createSecurityHeadersMiddleware({
			frameOptions: false,
			xssProtection: false,
		});
		const result = await mw({
			request: new Request("http://localhost/test"),
			response: {
				status: (code: number) => ({ status: code }),
				redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
				json: (data: any) =>
					new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } }),
				send: (body: string) => new Response(body),
				headers: (h: Record<string, string>) => ({ headers: h }),
			},
			next: async () => new Response("OK"),
		});

		expect(result!.headers.get("X-Frame-Options")).toBeNull();
		expect(result!.headers.get("X-XSS-Protection")).toBeNull();
		expect(result!.headers.get("X-Content-Type-Options")).toBe("nosniff");
	});
});

// ─── User Agent ────────────────────────────────────────

describe("User Agent - 브라우저 감지", () => {
	test("Chrome", () => {
		const ua = UserAgent.parse(
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
		);
		expect(ua.browser).toBe("Chrome");
		expect(ua.browserVersion).toBe("120.0.0.0");
		expect(ua.os).toBe("Windows");
		expect(ua.isMobile).toBe(false);
		expect(ua.isBot).toBe(false);
	});

	test("Firefox", () => {
		const ua = UserAgent.parse("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Firefox/121.0");
		expect(ua.browser).toBe("Firefox");
		expect(ua.browserVersion).toBe("121.0");
		expect(ua.os).toBe("macOS");
	});

	test("Safari", () => {
		const ua = UserAgent.parse(
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 Safari/17.2",
		);
		expect(ua.browser).toBe("Safari");
		expect(ua.os).toBe("macOS");
	});

	test("Edge", () => {
		const ua = UserAgent.parse(
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120.0.0.0",
		);
		expect(ua.browser).toBe("Edge");
	});
});

describe("User Agent - 모바일/태블릿", () => {
	test("iPhone", () => {
		const ua = UserAgent.parse(
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
		);
		expect(ua.isMobile).toBe(true);
		expect(ua.os).toBe("iOS");
		expect(ua.platform).toBe("iOS");
	});

	test("Android 모바일", () => {
		const ua = UserAgent.parse(
			"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
		);
		expect(ua.isMobile).toBe(true);
		expect(ua.os).toBe("Android");
	});

	test("iPad 태블릿", () => {
		const ua = UserAgent.parse(
			"Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
		);
		expect(ua.isTablet).toBe(true);
	});
});

describe("User Agent - 봇 감지", () => {
	test("Googlebot", () => {
		const ua = UserAgent.parse(
			"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
		);
		expect(ua.isBot).toBe(true);
	});

	test("curl", () => {
		const ua = UserAgent.parse("curl/8.4.0");
		expect(ua.isBot).toBe(true);
	});

	test("일반 브라우저는 봇 아님", () => {
		const ua = UserAgent.parse("Mozilla/5.0 Chrome/120.0.0.0");
		expect(ua.isBot).toBe(false);
	});
});

describe("User Agent - 정적 메서드", () => {
	test("isBrowser", () => {
		const req = new Request("http://localhost", {
			headers: { "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0" },
		});
		expect(UserAgent.isBrowser(req)).toBe(true);
		expect(UserAgent.isBrowser(req, "Chrome")).toBe(true);
		expect(UserAgent.isBrowser(req, "Firefox")).toBe(false);
	});

	test("isMobile", () => {
		const req = new Request("http://localhost", {
			headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2) Mobile" },
		});
		expect(UserAgent.isMobile(req)).toBe(true);
	});

	test("빈 UA 문자열", () => {
		const ua = UserAgent.parse("");
		expect(ua.browser).toBe("Unknown");
		expect(ua.os).toBe("Unknown");
	});
});

// ─── Profiler ──────────────────────────────────────────

describe("Profiler", () => {
	test("활성화/비활성화", () => {
		Profiler.enable(true);
		expect(Profiler.isEnabled()).toBe(true);
		Profiler.enable(false);
		expect(Profiler.isEnabled()).toBe(false);
	});

	test("벤치마크 측정", async () => {
		Profiler.enable(true);
		Profiler.reset();

		const result = await Profiler.benchmark("test_op", async () => {
			// 약간의 작업
			await new Promise((r) => setTimeout(r, 10));
			return 42;
		});

		expect(result).toBe(42);

		const data = Profiler.getData();
		const bm = data.benchmarks.find((b) => b.name === "test_op");
		expect(bm).toBeDefined();
		expect(bm!.durationMs).toBeGreaterThanOrEqual(9);

		Profiler.enable(false);
	});

	test("쿼리 로깅", () => {
		Profiler.enable(true);
		Profiler.reset();

		Profiler.logQuery("SELECT * FROM users WHERE id = ?", [1], 5.2);
		Profiler.logQuery("INSERT INTO posts (title) VALUES (?)", ["Hello"], 3.1);

		const data = Profiler.getData();
		expect(data.queries.length).toBe(2);
		expect(data.queries[0].sql).toBe("SELECT * FROM users WHERE id = ?");
		expect(data.queries[0].bindings).toEqual([1]);
		expect(data.queries[0].durationMs).toBe(5.2);

		Profiler.enable(false);
	});

	test("리셋", () => {
		Profiler.enable(true);
		Profiler.reset();

		Profiler.logQuery("SELECT 1", [], 0.1);
		Profiler.reset();

		const data = Profiler.getData();
		expect(data.queries.length).toBe(0);

		Profiler.enable(false);
	});

	test("비활성화 시 미측정", () => {
		Profiler.enable(false);
		Profiler.reset();

		Profiler.start("nope");
		Profiler.end("nope");
		Profiler.logQuery("SELECT 1", [], 1);

		const data = Profiler.getData();
		expect(data.benchmarks.length).toBe(0);
		expect(data.queries.length).toBe(0);
	});

	test("render: HTML 생성", () => {
		Profiler.enable(true);
		Profiler.reset();

		Profiler.logQuery("SELECT 1", [], 0.5);
		const html = Profiler.render();

		expect(html).toContain("BunIgniter Profiler");
		expect(html).toContain("SELECT 1");

		Profiler.enable(false);
	});

	test("render: 비활성화 시 빈 문자열", () => {
		Profiler.enable(false);
		expect(Profiler.render()).toBe("");
	});
});
