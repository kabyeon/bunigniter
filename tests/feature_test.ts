// ============================================================
// BunIgniter - Cookie, Archive, Shell, AuditLog 테스트
// ============================================================

import { describe, test, expect, beforeEach } from "bun:test";
import {
	getCookie,
	getCookies,
	hasCookie,
	setCookie,
	deleteCookie,
	parseCookie,
	isCookieExpired,
} from "../system/core/cookie.ts";
import { Archive } from "../system/core/archive.ts";
import { Shell } from "../system/core/shell.ts";
import { AuditLog } from "../system/core/audit_log.ts";

// ─── Cookie 테스트 ──────────────────────────────────────

describe("Cookie Helper", () => {
	test("getCookie - 쿠키 읽기", () => {
		const request = new Request("http://localhost", {
			headers: { cookie: "theme=dark; lang=ko" },
		});
		expect(getCookie(request, "theme")).toBe("dark");
		expect(getCookie(request, "lang")).toBe("ko");
	});

	test("getCookie - 존재하지 않는 쿠키", () => {
		const request = new Request("http://localhost", {
			headers: { cookie: "theme=dark" },
		});
		expect(getCookie(request, "nonexistent")).toBeNull();
	});

	test("getCookie - 쿠키 헤더 없음", () => {
		const request = new Request("http://localhost");
		expect(getCookie(request, "theme")).toBeNull();
	});

	test("getCookies - 전체 쿠키", () => {
		const request = new Request("http://localhost", {
			headers: { cookie: "a=1; b=2; c=3" },
		});
		const cookies = getCookies(request);
		expect(cookies.a).toBe("1");
		expect(cookies.b).toBe("2");
		expect(cookies.c).toBe("3");
	});

	test("hasCookie - 존재 여부", () => {
		const request = new Request("http://localhost", {
			headers: { cookie: "theme=dark" },
		});
		expect(hasCookie(request, "theme")).toBe(true);
		expect(hasCookie(request, "nonexistent")).toBe(false);
	});

	test("hasCookie - 쿠키 없음", () => {
		const request = new Request("http://localhost");
		expect(hasCookie(request, "theme")).toBe(false);
	});

	test("setCookie - 기본 옵션", () => {
		const header = setCookie("session", "abc123");
		expect(header).toContain("session=abc123");
		expect(header).toContain("Path=/");
		expect(header.toLowerCase()).toContain("samesite=lax");
	});

	test("setCookie - 전체 옵션", () => {
		const header = setCookie("session", "abc123", {
			httpOnly: true,
			secure: true,
			maxAge: 3600,
			sameSite: "strict",
			domain: "example.com",
		});
		expect(header.toLowerCase()).toContain("httponly");
		expect(header.toLowerCase()).toContain("secure");
		expect(header).toContain("Max-Age=3600");
		expect(header.toLowerCase()).toContain("samesite=strict");
		expect(header.toLowerCase()).toContain("domain=example.com");
	});

	test("deleteCookie - 삭제 쿠키", () => {
		const header = deleteCookie("session");
		expect(header).toContain("session=");
		expect(header).toContain("Max-Age=0");
	});

	test("parseCookie - 쿠키 파싱", () => {
		const parsed = parseCookie("session=abc123; Path=/; HttpOnly; Secure");
		expect(parsed.name).toBe("session");
		expect(parsed.value).toBe("abc123");
		expect(parsed.httpOnly).toBe(true);
		expect(parsed.secure).toBe(true);
	});

	test("isCookieExpired - 만료되지 않은 쿠키", () => {
		const header = setCookie("test", "value", { maxAge: 3600 });
		expect(isCookieExpired(header)).toBe(false);
	});

	test("isCookieExpired - 만료된 쿠키", () => {
		const header = setCookie("test", "value", {
			expires: new Date(0),
		});
		expect(isCookieExpired(header)).toBe(true);
	});
});

// ─── Archive 테스트 ──────────────────────────────────────

describe("Archive", () => {
	test("아카이브 생성", async () => {
		const archive = Archive.create({
			"hello.txt": "Hello, World!",
			"data.json": JSON.stringify({ foo: "bar" }),
		});
		expect(archive).toBeDefined();

		const bytes = await archive.bytes();
		expect(bytes.length).toBeGreaterThan(0);
	});

	test("아카이브 생성 (gzip)", async () => {
		const archive = Archive.create(
			{ "test.txt": "Compressed content" },
			{ compress: "gzip" },
		);
		const bytes = await archive.bytes();
		expect(bytes.length).toBeGreaterThan(0);
	});

	test("아카이브 파일 목록 조회", async () => {
		const archive = Archive.create({
			"file1.txt": "Content 1",
			"dir/file2.txt": "Content 2",
		});
		const files = await archive.listFiles();
		expect(files.length).toBe(2);
		expect(files.some((f) => f.path === "file1.txt")).toBe(true);
		expect(files.some((f) => f.path === "dir/file2.txt")).toBe(true);
	});

	test("아카이브 특정 파일 읽기", async () => {
		const archive = Archive.create({
			"readme.txt": "Hello from archive!",
		});
		const content = await archive.readFile("readme.txt");
		expect(content).toBe("Hello from archive!");
	});

	test("아카이브 JSON 파일 읽기", async () => {
		const archive = Archive.create({
			"package.json": JSON.stringify({ name: "test", version: "1.0.0" }),
		});
		const json = await archive.readJson<{ name: string }>("package.json");
		expect(json).not.toBeNull();
		expect(json?.name).toBe("test");
	});

	test("아카이브 blob 반환", async () => {
		const archive = Archive.create({ "test.txt": "hello" });
		const blob = await archive.blob();
		expect(blob).toBeDefined();
		expect(blob.size).toBeGreaterThan(0);
	});

	test("바이트에서 아카이브 로드", async () => {
		const original = Archive.create({ "test.txt": "original" });
		const bytes = await original.bytes();

		const loaded = Archive.fromBytes(bytes);
		const content = await loaded.readFile("test.txt");
		expect(content).toBe("original");
	});
});

// ─── Shell 테스트 ──────────────────────────────────────

describe("Shell", () => {
	test("run - 명령어 실행", async () => {
		const result = await Shell.run("echo hello");
		expect(result.success).toBe(true);
		expect(result.stdout.trim()).toBe("hello");
		expect(result.exitCode).toBe(0);
	});

	test("exec - 배열 명령어 실행", async () => {
		const result = await Shell.exec("echo", ["hello", "world"]);
		expect(result.success).toBe(true);
		expect(result.stdout.trim()).toBe("hello world");
	});

	test("runSync - 동기 실행", () => {
		const result = Shell.runSync("echo sync");
		expect(result.success).toBe(true);
		expect(result.stdout.trim()).toBe("sync");
	});

	test("output - 표준 출력만 반환", async () => {
		const output = await Shell.output("echo test-output");
		expect(output).toBe("test-output");
	});

	test("success - 성공 여부만 반환", async () => {
		const ok = await Shell.success("echo ok");
		expect(ok).toBe(true);
	});

	test("실패한 명령어", async () => {
		const result = await Shell.run("false");
		expect(result.success).toBe(false);
		expect(result.exitCode).not.toBe(0);
	});

	test("quiet - 종료 코드만 반환", async () => {
		const code = await Shell.quiet("echo quiet");
		expect(code).toBe(0);
	});
});

// ─── AuditLog 테스트 ──────────────────────────────────────

describe("AuditLog", () => {
	beforeEach(() => {
		AuditLog.configure({
			enabled: true,
			trackEvents: ["create", "update", "delete", "login"],
		});
	});

	test("설정 변경", () => {
		AuditLog.configure({ enabled: false });
		expect(AuditLog.isEnabled()).toBe(false);
		AuditLog.configure({ enabled: true });
		expect(AuditLog.isEnabled()).toBe(true);
	});

	test("활성화 여부", () => {
		expect(AuditLog.isEnabled()).toBe(true);
	});

	test("비활성 시 로그 미기록", async () => {
		AuditLog.configure({ enabled: false });
		const result = await AuditLog.log("create", "test", "1", {});
		expect(result).toBeNull();
		AuditLog.configure({ enabled: true });
	});

	test("추적 이벤트 필터링", async () => {
		AuditLog.configure({ enabled: true, trackEvents: ["create"] });
		// "update"는 trackEvents에 없으므로 무시됨
		const result = await AuditLog.log("update", "test", "1", {});
		expect(result).toBeNull();
		AuditLog.configure({
			enabled: true,
			trackEvents: ["create", "update", "delete", "login"],
		});
	});

	test("모델 추적 등록", () => {
		AuditLog.track({ tableName: "posts" }, ["create", "delete"]);
		expect(AuditLog.getTrackedModels()).toContain("posts");
	});

	test("추적된 모델 목록", () => {
		AuditLog.track({ tableName: "users" }, ["create"]);
		const tracked = AuditLog.getTrackedModels();
		expect(tracked).toContain("users");
	});
});
