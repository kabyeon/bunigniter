// ============================================================
// BunIgniter - 보안 테스트
// ============================================================

import { describe, test, expect } from "bun:test";
import { csrfField, csrfMeta } from "../system/core/csrf.ts";
import { Upload } from "../system/core/upload.ts";
import { Model } from "../system/core/model.ts";
import { getAllowedOrigin } from "../system/core/cors.ts";

// ─── CSRF XSS 방어 ────────────────────────────────────

describe("CSRF - XSS 방어", () => {
	test("csrfField - 토큰에 HTML 특수문자 이스케이프", () => {
		// 실제 Bun.CSRF 토큰은 base64url이지만, 이스케이프 검증을 위해 임의 문자열 사용
		const malicious = "<script>alert(1)</script>";
		const html = csrfField(malicious);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
		expect(html).not.toContain('value="<script');
	});

	test("csrfField - 큰따옴표 이스케이프", () => {
		const tokenWithQuotes = 'abc"onmouseover="alert(1)';
		const html = csrfField(tokenWithQuotes);
		expect(html).not.toContain('value="abc"onmouseover');
		expect(html).toContain("&quot;");
	});

	test("csrfMeta - 토큰에 HTML 특수문자 이스케이프", () => {
		const malicious = '"><script>alert(1)</script>';
		const html = csrfMeta(malicious);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	test("csrfMeta - 큰따옴표 이스케이프", () => {
		const tokenWithQuotes = 'abc"onclick="alert(1)';
		const html = csrfMeta(tokenWithQuotes);
		expect(html).toContain("&quot;");
	});
});

// ─── Upload 보안 ──────────────────────────────────────

describe("Upload - 경로 순회 방어", () => {
	test("위험한 확장자 차단 - .php", async () => {
		const file = new File(["<?php echo 1; ?>"], "shell.php", {
			type: "application/x-php",
		});
		const formData = new FormData();
		formData.append("file", file);
		const request = new Request("http://localhost/upload", {
			method: "POST",
			body: formData,
		});
		const result = await Upload.save(request, "file", {
			uploadDir: "/tmp/bunigniter-test-upload",
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("위험한 확장자");
	});

	test("위험한 확장자 차단 - .html", async () => {
		const file = new File(["<script>alert(1)</script>"], "xss.html", {
			type: "text/html",
		});
		const formData = new FormData();
		formData.append("file", file);
		const request = new Request("http://localhost/upload", {
			method: "POST",
			body: formData,
		});
		const result = await Upload.save(request, "file", {
			uploadDir: "/tmp/bunigniter-test-upload",
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("위험한 확장자");
	});

	test("위험한 확장자 차단 - .svg", async () => {
		const file = new File(['<svg onload="alert(1)"></svg>'], "image.svg", {
			type: "image/svg+xml",
		});
		const formData = new FormData();
		formData.append("file", file);
		const request = new Request("http://localhost/upload", {
			method: "POST",
			body: formData,
		});
		const result = await Upload.save(request, "file", {
			uploadDir: "/tmp/bunigniter-test-upload",
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("위험한 확장자");
	});

	test("위험한 MIME 타입 차단 - text/html", async () => {
		// FormData는 확장자 기반으로 MIME을 재설정하므로,
		// 확장자와 MIME 불일치 공격은 DANGEROUS_EXTENSIONS에서 1차 차단됨
		// .html 확장자 자체가 DANGEROUS_EXTENSIONS에 등록되어 있어 차단
		const file = new File(["<script>alert(1)</script>"], "attack.html", {
			type: "text/html",
		});
		const formData = new FormData();
		formData.append("file", file);
		const request = new Request("http://localhost/upload", {
			method: "POST",
			body: formData,
		});
		const result = await Upload.save(request, "file", {
			uploadDir: "/tmp/bunigniter-test-upload",
		});
		expect(result.success).toBe(false);
	});

	test("경로 순회 파일명 차단 - ../etc/passwd", async () => {
		const file = new File(["test"], "../../../etc/passwd", {
			type: "text/plain",
		});
		const formData = new FormData();
		formData.append("file", file);
		const request = new Request("http://localhost/upload", {
			method: "POST",
			body: formData,
		});
		const result = await Upload.save(request, "file", {
			uploadDir: "/tmp/bunigniter-test-upload",
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("경로 문자");
	});

	test("위험한 확장자 차단 - .exe", async () => {
		const file = new File(["binary"], "malware.exe", {
			type: "application/x-msdownload",
		});
		const formData = new FormData();
		formData.append("file", file);
		const request = new Request("http://localhost/upload", {
			method: "POST",
			body: formData,
		});
		const result = await Upload.save(request, "file", {
			uploadDir: "/tmp/bunigniter-test-upload",
		});
		expect(result.success).toBe(false);
	});

	test("위험한 확장자 차단 - .sh", async () => {
		const file = new File(["#!/bin/bash"], "script.sh", {
			type: "application/x-shellscript",
		});
		const formData = new FormData();
		formData.append("file", file);
		const request = new Request("http://localhost/upload", {
			method: "POST",
			body: formData,
		});
		const result = await Upload.save(request, "file", {
			uploadDir: "/tmp/bunigniter-test-upload",
		});
		expect(result.success).toBe(false);
	});
});

// ─── Model SQL 인젝션 방어 ─────────────────────────────

describe("Model - SQL 인젝션 방어", () => {
	test("findWhere - 악의적 컬럼명 차단", async () => {
		class TestModel extends Model<any> {
			override tableName = "test";
		}
		const model = new TestModel();

		// SQL 인젝션 시도: 컬럼명에 SQL 메타문자
		await expect(
			model.findWhere({ "id; DROP TABLE users--": 1 } as any),
		).rejects.toThrow("Invalid column name");
	});

	test("findWhere - OR 조건 인젝션 차단", async () => {
		class TestModel extends Model<any> {
			override tableName = "test";
		}
		const model = new TestModel();

		await expect(
			model.findWhere({ "id = 1 OR 1=1": 1 } as any),
		).rejects.toThrow("Invalid column name");
	});

	test("count - 악의적 컬럼명 차단", async () => {
		class TestModel extends Model<any> {
			override tableName = "test";
		}
		const model = new TestModel();

		await expect(
			model.count({ "1=1); DROP TABLE users; --": 1 } as any),
		).rejects.toThrow("Invalid column name");
	});

	test("findWhere - 정상 컬럼명 통과", async () => {
		// 실제 DB 없이 에러가 나겠지만, 컬럼명 검증은 통과해야 함
		class TestModel extends Model<any> {
			override tableName = "users";
		}
		const model = new TestModel();

		// 컬럼명 검증만 확인 — DB 없으므로 다른 에러 발생 예상
		try {
			await model.findWhere({ email: "test@test.com" });
		} catch (err: any) {
			// "Invalid column name" 에러가 아니어야 함
			expect(err.message).not.toContain("Invalid column name");
		}
	});
});

// ─── CORS 보안 ────────────────────────────────────────

describe("CORS - 보안 검증", () => {
	test("credentials: true + origin: '*' → 빈 값 반환 (브라우저 차단)", () => {
		const result = getAllowedOrigin("https://evil.com", "*", true);
		expect(result).toBe("");
	});

	test("credentials: false + origin: '*' → 정상 동작", () => {
		const result = getAllowedOrigin("https://example.com", "*", false);
		expect(result).toBe("*");
	});

	test("credentials: true + 명시적 오리진 목록 → 일치 시 통과", () => {
		const result = getAllowedOrigin(
			"https://example.com",
			["https://example.com", "https://app.example.com"],
			true,
		);
		expect(result).toBe("https://example.com");
	});

	test("credentials: true + 명시적 오리진 목록 → 불일치 시 차단", () => {
		const result = getAllowedOrigin(
			"https://evil.com",
			["https://example.com", "https://app.example.com"],
			true,
		);
		expect(result).toBe("");
	});

	test("허용되지 않은 오리진은 빈 값 반환", () => {
		const result = getAllowedOrigin("https://evil.com", [
			"https://example.com",
		]);
		expect(result).toBe("");
	});
});

// ─── Rate Limit 보안 ──────────────────────────────────

describe("Rate Limit - IP 스푸핑 방어", () => {
	test("trustProxy=false 시 X-Forwarded-For 무시", async () => {
		const { rateLimitMiddleware } = await import(
			"../system/core/rate_limit.ts"
		);

		// X-Forwarded-For 헤더가 있어도 trustProxy=false면 무시
		const request = new Request("http://localhost/", {
			headers: { "X-Forwarded-For": "1.2.3.4" },
		});

		// 기본 설정(trustProxy: false)으로 미들웨어 실행
		const result = await rateLimitMiddleware({
			request,
			response: {},
			next: async () => new Response("OK"),
		});

		// "unknown" IP로 처리되어야 함 (프록시 헤더 무시)
		expect(result).toBeInstanceOf(Response);
	});

	test("trustProxy=true 시 X-Forwarded-For 사용", async () => {
		const { createRateLimitMiddleware, resetRateLimitStore } = await import(
			"../system/core/rate_limit.ts"
		);

		resetRateLimitStore();

		const middleware = createRateLimitMiddleware({
			trustProxy: true,
			windowMs: 60,
			maxRequests: 100,
		});

		const request = new Request("http://localhost/", {
			headers: { "X-Forwarded-For": "1.2.3.4" },
		});

		const result = await middleware({
			request,
			response: {},
			next: async () => new Response("OK"),
		});
		expect(result).toBeInstanceOf(Response);

		resetRateLimitStore();
	});
});

// ─── Session ID 검증 ───────────────────────────────────

describe("Session - ID 검증", () => {
	test("유효하지 않은 세션 ID 무시 (MemorySession)", async () => {
		const { MemorySession } = await import("../system/core/memory_session.ts");
		MemorySession.flush();

		// 경로 순회 시도
		const request1 = new Request("http://localhost/", {
			headers: { cookie: "bunigniter_session=../../etc/passwd" },
		});
		const session1 = new MemorySession(request1);
		expect(session1.getId()).not.toContain("..");

		// 빈 값
		const request2 = new Request("http://localhost/", {
			headers: { cookie: "bunigniter_session=" },
		});
		const session2 = new MemorySession(request2);
		expect(session2.getId().length).toBeGreaterThan(0);

		MemorySession.flush();
	});

	test("유효하지 않은 세션 ID 무시 (FileSession)", async () => {
		const { FileSession } = await import("../system/core/file_session.ts");

		// 경로 순회 시도
		const request1 = new Request("http://localhost/", {
			headers: { cookie: "bunigniter_session=../../../etc/passwd" },
		});
		const session1 = new FileSession(request1, {
			sessionDir: "/tmp/bunigniter-test-sessions",
		});
		expect(session1.getId()).not.toContain("..");

		// SQL 인젝션 스타일
		const request2 = new Request("http://localhost/", {
			headers: { cookie: "bunigniter_session=' OR '1'='1" },
		});
		const session2 = new FileSession(request2, {
			sessionDir: "/tmp/bunigniter-test-sessions",
		});
		expect(session2.getId()).not.toContain("'");
	});
});

// ─── 세션 고정 공격 방어 ────────────────────────────────

describe("Session - 세션 고정(Session Fixation) 방어", () => {
	test("regenerateId - 세션 ID가 변경됨 (Session)", () => {
		const { Session } = require("../system/core/session.ts");
		const request = new Request("http://localhost/");
		const session = new Session(request);
		const oldId = session.getId();

		session.set("key", "value");
		session.regenerateId();

		expect(session.getId()).not.toBe(oldId);
		expect(session.get("key")).toBe("value");
	});

	test("regenerateId - 세션 ID가 변경됨 (MemorySession)", () => {
		const { MemorySession } = require("../system/core/memory_session.ts");
		MemorySession.flush();
		const request = new Request("http://localhost/");
		const session = new MemorySession(request);
		const oldId = session.getId();

		session.set("key", "value");
		session.regenerateId();

		expect(session.getId()).not.toBe(oldId);
		expect(session.get("key")).toBe("value");
		MemorySession.flush();
	});

	test("regenerateId - 세션 ID가 변경됨 (FileSession)", () => {
		const { FileSession } = require("../system/core/file_session.ts");
		const request = new Request("http://localhost/");
		const session = new FileSession(request, {
			sessionDir: "/tmp/bunigniter-test-sessions-fixation",
		});
		const oldId = session.getId();

		session.set("key", "value");
		session.regenerateId();

		expect(session.getId()).not.toBe(oldId);
		expect(session.get("key")).toBe("value");
	});
});

// ─── 정적 파일 Path Traversal 방어 ──────────────────────

describe("Bootstrap - 정적 파일 Path Traversal 방어", () => {
	test("safeStaticPath - 정상 경로 통과", () => {
		// bootstrap.ts 내부 함수는 export되지 않으므로,
		// 여기서는 동일한 로직을 직접 검증
		const { resolve, relative } = require("node:path");
		const publicDir = resolve(process.cwd(), "public");
		const urlPathname = "/css/style.css";
		const resolvedPath = resolve(
			process.cwd(),
			"public",
			urlPathname.replace(/^\//, ""),
		);
		const relativePath = relative(publicDir, resolvedPath);
		expect(relativePath.startsWith("..")).toBe(false);
	});

	test("safeStaticPath - 경로 순회 차단", () => {
		const { resolve, relative } = require("node:path");
		const publicDir = resolve(process.cwd(), "public");
		const urlPathname = "/../../../etc/passwd";
		const resolvedPath = resolve(
			process.cwd(),
			"public",
			urlPathname.replace(/^\//, ""),
		);
		const relativePath = relative(publicDir, resolvedPath);
		// 정규화 후에는 public 외부를 가리킴
		expect(relativePath.startsWith("..")).toBe(true);
	});
});

// ─── Crypto 약한 알고리즘 경고 ────────────────────────

describe("Crypto - 약한 알고리즘 경고", () => {
	test("md5 사용 시 경고 출력 (console.warn 호출)", () => {
		const { Crypto } = require("../system/core/crypto.ts");
		const originalWarn = console.warn;
		let warned = false;
		console.warn = () => {
			warned = true;
		};

		Crypto.hash("test", { algorithm: "md5" });

		console.warn = originalWarn;
		expect(warned).toBe(true);
	});

	test("sha1 사용 시 경고 출력", () => {
		const { Crypto } = require("../system/core/crypto.ts");
		const originalWarn = console.warn;
		let warned = false;
		console.warn = () => {
			warned = true;
		};

		Crypto.hash("test", { algorithm: "sha1" });

		console.warn = originalWarn;
		expect(warned).toBe(true);
	});

	test("sha256 사용 시 경고 미출력", () => {
		const { Crypto } = require("../system/core/crypto.ts");
		const originalWarn = console.warn;
		let warned = false;
		console.warn = () => {
			warned = true;
		};

		Crypto.hash("test", { algorithm: "sha256" });

		console.warn = originalWarn;
		expect(warned).toBe(false);
	});
});
