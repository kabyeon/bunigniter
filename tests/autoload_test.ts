// ============================================================
// Autoload 테스트
// ============================================================

import { describe, expect, test } from "bun:test";
import { autoloadRegistry } from "../system/core/autoload.ts";

describe("Autoload Registry", () => {
	test("헬퍼 등록 및 조회", () => {
		autoloadRegistry.registerHelper("url", { siteUrl: () => "http://localhost" });
		const helper = autoloadRegistry.getHelper("url");
		expect(helper).toBeDefined();
		expect(helper!.siteUrl()).toBe("http://localhost");
	});

	test("라이브러리 등록 및 조회", () => {
		const mockSession = { get: () => "test", set: () => {} };
		autoloadRegistry.registerLibrary("session", mockSession);
		const session = autoloadRegistry.getLibrary("session");
		expect(session).toBeDefined();
		expect(session!.get()).toBe("test");
	});

	test("모델 등록 및 조회", () => {
		const mockModel = { tableName: "users" };
		autoloadRegistry.registerModel("user_model", mockModel);
		const model = autoloadRegistry.getModel("user_model");
		expect(model).toBeDefined();
		expect(model!.tableName).toBe("users");
	});

	test("getAllHelperFunctions: 모든 헬퍼 병합", () => {
		autoloadRegistry.registerHelper("string", { slug: (s: string) => s.toLowerCase() });
		const all = autoloadRegistry.getAllHelperFunctions();
		expect(all.siteUrl).toBeDefined();
		expect(all.slug).toBeDefined();
	});

	test("getLoadedInfo", () => {
		const info = autoloadRegistry.getLoadedInfo();
		expect(info.helpers).toContain("url");
		expect(info.libraries).toContain("session");
		expect(info.models).toContain("user_model");
	});

	test("미등록 항목은 undefined", () => {
		expect(autoloadRegistry.getHelper("nonexistent")).toBeUndefined();
		expect(autoloadRegistry.getLibrary("nonexistent")).toBeUndefined();
		expect(autoloadRegistry.getModel("nonexistent")).toBeUndefined();
	});

	test("reset", () => {
		autoloadRegistry.reset();
		const info = autoloadRegistry.getLoadedInfo();
		expect(info.helpers.length).toBe(0);
		expect(info.libraries.length).toBe(0);
		expect(info.models.length).toBe(0);
	});
});
