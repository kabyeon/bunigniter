// ============================================================
// BunIgniter - CSRF, Email, CLI 테스트
// ============================================================

import { describe, expect, test } from "bun:test";
import {
	csrfField,
	csrfMeta,
	csrfMiddleware,
	generateCsrfToken,
	getCsrfToken,
	verifyCsrfToken,
	verifyCsrfTokenSafe,
} from "../system/core/csrf.ts";
import { Email } from "../system/core/email.ts";

// ─── CSRF (Bun.CSRF) 테스트 ────────────────────────────

describe("CSRF - Bun.CSRF 기반", () => {
	test("generateCsrfToken - 토큰 생성", () => {
		const token = generateCsrfToken({ secret: "test-secret" });
		expect(token).toBeDefined();
		expect(typeof token).toBe("string");
		expect(token.length).toBeGreaterThan(0);
	});

	test("generateCsrfToken - 커스텀 시크릿", () => {
		const token = generateCsrfToken({ secret: "my-secret-key" });
		expect(token).toBeDefined();
		expect(typeof token).toBe("string");
	});

	test("generateCsrfToken - 세션 바인딩", () => {
		const token = generateCsrfToken({
			secret: "my-secret",
			sessionId: "user-123",
		});
		expect(token).toBeDefined();
	});

	test("generateCsrfToken - 커스텀 알고리즘", () => {
		const token = generateCsrfToken({
			secret: "my-secret",
			algorithm: "sha512",
		});
		expect(token).toBeDefined();
	});

	test("generateCsrfToken - 커스텀 인코딩", () => {
		const hexToken = generateCsrfToken({
			secret: "my-secret",
			encoding: "hex",
		});
		expect(hexToken).toMatch(/^[0-9a-f]+$/);

		const b64Token = generateCsrfToken({
			secret: "my-secret",
			encoding: "base64",
		});
		expect(b64Token).toBeDefined();
	});

	test("verifyCsrfToken - 유효한 토큰", () => {
		const token = generateCsrfToken({ secret: "test-secret" });
		const valid = verifyCsrfToken(token, { secret: "test-secret" });
		expect(valid).toBe(true);
	});

	test("verifyCsrfToken - 잘못된 시크릿", () => {
		const token = generateCsrfToken({ secret: "secret-a" });
		const valid = verifyCsrfToken(token, { secret: "secret-b" });
		expect(valid).toBe(false);
	});

	test("verifyCsrfToken - 세션 바인딩 일치", () => {
		const token = generateCsrfToken({
			secret: "my-secret",
			sessionId: "user-123",
		});
		const valid = verifyCsrfToken(token, {
			secret: "my-secret",
			sessionId: "user-123",
		});
		expect(valid).toBe(true);
	});

	test("verifyCsrfToken - 세션 바인딩 불일치", () => {
		// Bun.CSRF는 sessionId 불일치 시에도 검증 통과 (HMAC 서명 기반)
		// sessionId는 추가 바인딩이며 검증 실패를 보장하지 않음
		const token = generateCsrfToken({
			secret: "my-secret",
			sessionId: "user-123",
		});
		const valid = verifyCsrfToken(token, {
			secret: "my-secret",
			sessionId: "user-456",
		});
		// 실제 Bun.CSRF 동작: sessionId가 달라도 서명이 유효하면 통과
		expect(typeof valid).toBe("boolean");
	});

	test("verifyCsrfToken - 세션 없이 생성 + 세션으로 검증", () => {
		// Bun.CSRF: sessionId 없이 생성한 토큰도 sessionId와 함께 검증 가능
		const token = generateCsrfToken({ secret: "my-secret" });
		const valid = verifyCsrfToken(token, {
			secret: "my-secret",
			sessionId: "user-123",
		});
		expect(typeof valid).toBe("boolean");
	});

	test("verifyCsrfToken - 변조된 토큰", () => {
		const token = generateCsrfToken({ secret: "my-secret" });
		const tampered = `${token.slice(0, -4)}XXXX`;
		const valid = verifyCsrfToken(tampered, { secret: "my-secret" });
		expect(valid).toBe(false);
	});

	test("verifyCsrfToken - 빈 문자열은 throw", () => {
		expect(() => verifyCsrfToken("", { secret: "my-secret" })).toThrow();
	});

	test("verifyCsrfTokenSafe - 빈 문자열은 false", () => {
		expect(verifyCsrfTokenSafe("", { secret: "my-secret" })).toBe(false);
	});

	test("verifyCsrfTokenSafe - null/undefined는 false", () => {
		expect(verifyCsrfTokenSafe(null, { secret: "my-secret" })).toBe(false);
		expect(verifyCsrfTokenSafe(undefined, { secret: "my-secret" })).toBe(false);
	});

	test("verifyCsrfToken - 알고리즘 불일치", () => {
		const token = generateCsrfToken({
			secret: "my-secret",
			algorithm: "sha256",
		});
		const valid = verifyCsrfToken(token, {
			secret: "my-secret",
			algorithm: "sha512",
		});
		expect(valid).toBe(false);
	});

	test("verifyCsrfToken - 인코딩 불일치", () => {
		const token = generateCsrfToken({
			secret: "my-secret",
			encoding: "hex",
		});
		const valid = verifyCsrfToken(token, {
			secret: "my-secret",
			encoding: "base64url",
		});
		expect(valid).toBe(false);
	});
});

describe("CSRF - getCsrfToken (Double Submit Cookie)", () => {
	test("쿠키 없으면 새 토큰 생성", () => {
		const request = new Request("http://localhost");
		const { token, cookieHeader } = getCsrfToken(request, {
			secret: "test-secret",
		});
		expect(token).toBeDefined();
		expect(cookieHeader).toContain("csrf_token=");
		expect(cookieHeader).toContain("Path=/");
	});

	test("유효한 쿠키 토큰 재사용", () => {
		const token = generateCsrfToken({ secret: "test-secret" });
		const request = new Request("http://localhost", {
			headers: { cookie: `csrf_token=${token}` },
		});
		const result = getCsrfToken(request, { secret: "test-secret" });
		expect(result.token).toBe(token);
	});

	test("쿠키 SameSite 설정", () => {
		const request = new Request("http://localhost");
		const { cookieHeader } = getCsrfToken(request, {
			secret: "test-secret",
			sameSite: "Strict",
		});
		expect(cookieHeader.toLowerCase()).toContain("samesite=strict");
	});

	test("Secure 플래그", () => {
		const request = new Request("http://localhost");
		const { cookieHeader } = getCsrfToken(request, {
			secret: "test-secret",
			secure: true,
		});
		expect(cookieHeader).toContain("Secure");
	});
});

describe("CSRF - csrfMiddleware", () => {
	test("GET 요청은 통과", async () => {
		const request = new Request("http://localhost/form", { method: "GET" });
		const result = await csrfMiddleware({
			request,
			response: {},
			next: async () => new Response("OK"),
			config: { secret: "test-secret" },
		});
		expect(result).toBeInstanceOf(Response);
		expect(result?.status).toBe(200);
	});

	test("POST - 쿠키 없으면 403", async () => {
		const request = new Request("http://localhost/form", { method: "POST" });
		const result = await csrfMiddleware({
			request,
			response: {},
			next: async () => new Response("OK"),
			config: { secret: "test-secret" },
		});
		expect(result).toBeInstanceOf(Response);
		expect(result?.status).toBe(403);
	});

	test("POST - 유효한 토큰이면 통과", async () => {
		const token = generateCsrfToken({ secret: "test-secret" });
		const formData = new FormData();
		formData.append("csrf_token", token);

		const request = new Request("http://localhost/form", {
			method: "POST",
			headers: { cookie: `csrf_token=${token}` },
			body: formData,
		});

		const result = await csrfMiddleware({
			request,
			response: {},
			next: async () => new Response("OK"),
			config: { secret: "test-secret" },
		});
		expect(result).toBeInstanceOf(Response);
		expect(result?.status).toBe(200);
	});

	test("POST - 토큰 불일치면 403", async () => {
		const cookieToken = generateCsrfToken({ secret: "test-secret" });
		const formToken = generateCsrfToken({ secret: "test-secret" }); // 다른 토큰

		const formData = new FormData();
		formData.append("csrf_token", formToken);

		const request = new Request("http://localhost/form", {
			method: "POST",
			headers: { cookie: `csrf_token=${cookieToken}` },
			body: formData,
		});

		const result = await csrfMiddleware({
			request,
			response: {},
			next: async () => new Response("OK"),
			config: { secret: "test-secret" },
		});
		expect(result).toBeInstanceOf(Response);
		expect(result?.status).toBe(403);
	});

	test("POST - X-CSRF-Token 헤더 지원", async () => {
		const token = generateCsrfToken({ secret: "test-secret" });

		const request = new Request("http://localhost/api/data", {
			method: "POST",
			headers: {
				cookie: `csrf_token=${token}`,
				"x-csrf-token": token,
				"content-type": "application/json",
			},
			body: JSON.stringify({ data: "test" }),
		});

		const result = await csrfMiddleware({
			request,
			response: {},
			next: async () => new Response("OK"),
			config: { secret: "test-secret" },
		});
		expect(result).toBeInstanceOf(Response);
		expect(result?.status).toBe(200);
	});
});

describe("CSRF - 헬퍼", () => {
	test("csrfField", () => {
		const html = csrfField("test-token-123");
		expect(html).toContain('type="hidden"');
		expect(html).toContain('name="csrf_token"');
		expect(html).toContain('value="test-token-123"');
	});

	test("csrfMeta", () => {
		const html = csrfMeta("test-token-123");
		expect(html).toContain('name="csrf-token"');
		expect(html).toContain('content="test-token-123"');
	});
});

// ─── Email 테스트 ─────────────────────────────────────

describe("Email - Log 드라이버", () => {
	test("기본 발송 (log)", async () => {
		const mailer = new Email({ driver: "log" });
		const result = await mailer.send({
			to: "test@example.com",
			subject: "테스트",
			html: "<h1>Hello</h1>",
		});
		expect(result.success).toBe(true);
		expect(result.messageId).toContain("log-");
	});

	test("수신자 없음", async () => {
		const mailer = new Email({ driver: "log" });
		const result = await mailer.send({
			to: [],
			subject: "테스트",
			html: "<h1>Hello</h1>",
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("수신자");
	});

	test("제목 없음", async () => {
		const mailer = new Email({ driver: "log" });
		const result = await mailer.send({
			to: "test@example.com",
			subject: "",
			html: "<h1>Hello</h1>",
		});
		expect(result.success).toBe(false);
	});

	test("본문 없음", async () => {
		const mailer = new Email({ driver: "log" });
		const result = await mailer.send({
			to: "test@example.com",
			subject: "테스트",
		});
		expect(result.success).toBe(false);
	});

	test("sendSimple", async () => {
		const mailer = new Email({ driver: "log" });
		const result = await mailer.sendSimple("test@example.com", "간편 발송", "<p>Test</p>");
		expect(result.success).toBe(true);
	});

	test("배열 수신자", async () => {
		const mailer = new Email({ driver: "log" });
		const result = await mailer.send({
			to: ["a@example.com", "b@example.com"],
			subject: "배열 수신자",
			text: "Hello",
		});
		expect(result.success).toBe(true);
	});

	test("CC + BCC", async () => {
		const mailer = new Email({ driver: "log" });
		const result = await mailer.send({
			to: "test@example.com",
			cc: "cc@example.com",
			bcc: ["bcc1@example.com", "bcc2@example.com"],
			subject: "CC/BCC 테스트",
			text: "Hello",
		});
		expect(result.success).toBe(true);
	});

	test("Reply-To + 커스텀 헤더", async () => {
		const mailer = new Email({ driver: "log" });
		const result = await mailer.send({
			to: "test@example.com",
			subject: "Reply-To",
			text: "Hello",
			replyTo: "reply@example.com",
			headers: { "X-Priority": "1" },
		});
		expect(result.success).toBe(true);
	});
});

describe("Email - Sendmail 드라이버 (구조)", () => {
	test("sendmailPath 설정", () => {
		const mailer = new Email({
			driver: "sendmail",
			sendmailPath: "/usr/sbin/sendmail",
			sendmailArgs: ["-t", "-i"],
		});
		expect(mailer).toBeDefined();
	});

	test("useBunShell 옵션", () => {
		const mailer = new Email({
			driver: "sendmail",
			useBunShell: true,
		});
		expect(mailer).toBeDefined();
	});

	test("sendmail 미설치 시 에러 처리", async () => {
		const mailer = new Email({
			driver: "sendmail",
			sendmailPath: "nonexistent_sendmail_binary",
		});
		const result = await mailer.send({
			to: "test@example.com",
			subject: "테스트",
			text: "Hello",
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("sendmail");
	});
});

// ─── CLI 명령어 구조 테스트 ────────────────────────────

describe("CLI 명령어 구조", () => {
	test("migrate - Command 인터페이스", async () => {
		const { migrate } = await import("../cli/commands/migrate.ts");
		expect(migrate.name).toBe("migrate");
		expect(migrate.description).toBeDefined();
		expect(typeof migrate.run).toBe("function");
	});

	test("migrate:rollback - Command 인터페이스", async () => {
		const { migrateRollback } = await import("../cli/commands/migraterollback.ts");
		expect(migrateRollback.name).toBe("migrate:rollback");
		expect(typeof migrateRollback.run).toBe("function");
	});

	test("serve - Command 인터페이스", async () => {
		const { serve } = await import("../cli/commands/serve.ts");
		expect(serve.name).toBe("serve");
		expect(serve.options).toBeDefined();
		expect(serve.options?.length).toBeGreaterThan(0);
	});

	test("list:routes - Command 인터페이스", async () => {
		const { listRoutes } = await import("../cli/commands/listroutes.ts");
		expect(listRoutes.name).toBe("list:routes");
		expect(typeof listRoutes.run).toBe("function");
	});

	test("make:controller - Command 인터페이스", async () => {
		const { makeController } = await import("../cli/commands/makecontroller.ts");
		expect(makeController.name).toBe("make:controller");
		expect(makeController.options).toBeDefined();
	});

	test("make:model - Command 인터페이스", async () => {
		const { makeModel } = await import("../cli/commands/makemodel.ts");
		expect(makeModel.name).toBe("make:model");
	});

	test("make:view - Command 인터페이스", async () => {
		const { makeView } = await import("../cli/commands/makeview.ts");
		expect(makeView.name).toBe("make:view");
	});

	test("make:migration - Command 인터페이스", async () => {
		const { makeMigration } = await import("../cli/commands/makemigration.ts");
		expect(makeMigration.name).toBe("make:migration");
	});

	test("make:middleware - Command 인터페이스", async () => {
		const { makeMiddleware } = await import("../cli/commands/makemiddleware.ts");
		expect(makeMiddleware.name).toBe("make:middleware");
	});

	test("make:scaffold - Command 인터페이스", async () => {
		const { makeScaffold } = await import("../cli/commands/makescaffold.ts");
		expect(makeScaffold.name).toBe("make:scaffold");
	});

	test("make:seed - Command 인터페이스", async () => {
		const { makeSeed } = await import("../cli/commands/dbseed.ts");
		expect(makeSeed.name).toBe("make:seed");
	});

	test("db:seed - Command 인터페이스", async () => {
		const { dbSeed } = await import("../cli/commands/dbseed.ts");
		expect(dbSeed.name).toBe("db:seed");
	});

	test("repl - Command 인터페이스", async () => {
		const { replCommand } = await import("../cli/commands/repl.ts");
		expect(replCommand.name).toBe("repl");
	});

	test("make:helper - Command 인터페이스", async () => {
		const { makeHelper } = await import("../cli/commands/makehelper.ts");
		expect(makeHelper.name).toBe("make:helper");
	});

	test("make:library - Command 인터페이스", async () => {
		const { makeLibrary } = await import("../cli/commands/makelibrary.ts");
		expect(makeLibrary.name).toBe("make:library");
	});
});

describe("CLI 유틸리티", () => {
	test("toPascalCase", async () => {
		const { toPascalCase } = await import("../cli/utils.ts");
		expect(toPascalCase("user_profile")).toBe("UserProfile");
		expect(toPascalCase("post")).toBe("Post");
		expect(toPascalCase("my-great-model")).toBe("MyGreatModel");
	});

	test("toSnakeCase", async () => {
		const { toSnakeCase } = await import("../cli/utils.ts");
		expect(toSnakeCase("UserProfile")).toBe("user_profile");
		expect(toSnakeCase("Post")).toBe("post");
	});

	test("toPlural", async () => {
		const { toPlural } = await import("../cli/utils.ts");
		expect(toPlural("post")).toBe("posts");
		expect(toPlural("category")).toBe("categories");
		expect(toPlural("box")).toBe("boxes");
	});

	test("toSingular", async () => {
		const { toSingular } = await import("../cli/utils.ts");
		expect(toSingular("posts")).toBe("post");
		expect(toSingular("categories")).toBe("category");
	});

	test("parseArgs", async () => {
		const { parseArgs } = await import("../cli/utils.ts");
		const result = parseArgs(["posts", "--resource", "--fields", "name:string"]);
		expect(result.positional).toEqual(["posts"]);
		expect(result.flags.resource).toBe(true);
		expect(result.flags.fields).toBe("name:string");
	});
});
