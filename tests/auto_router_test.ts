// ============================================================
// Auto Router 테스트
// ============================================================

import { beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { AutoRouterConfig } from "../system/core/auto_router.ts";
import { AutoRouter } from "../system/core/auto_router.ts";

const APP_ROOT = join(import.meta.dir, "..", "app");

describe("AutoRouter - 기본 해석", () => {
	test("빈 경로 → 기본 컨트롤러", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true, defaultController: "welcome" });
		const match = await ar.resolve("/");
		expect(match).not.toBeNull();
		expect(match!.className).toBe("Welcome");
		expect(match!.methodName).toBe("index");
	});

	test("루트 경로 → 기본 컨트롤러", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true, defaultController: "welcome" });
		const match = await ar.resolve("");
		expect(match).not.toBeNull();
		expect(match!.className).toBe("Welcome");
	});

	test("컨트롤러 이름 → index 메서드", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		const match = await ar.resolve("/posts");
		// app/controllers/post_controller.ts → PostController
		expect(match).not.toBeNull();
		expect(match!.className).toBe("Post");
		expect(match!.methodName).toBe("index");
	});

	test("컨트롤러/메서드 → 메서드 호출", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		const match = await ar.resolve("/posts/show");
		expect(match).not.toBeNull();
		expect(match!.className).toBe("Post");
		expect(match!.methodName).toBe("show");
	});

	test("컨트롤러/메서드/파라미터", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		const match = await ar.resolve("/posts/show/5");
		expect(match).not.toBeNull();
		expect(match!.methodName).toBe("show");
		expect(match!.params).toEqual(["5"]);
	});

	test("컨트롤러/메서드/다중파라미터", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		const match = await ar.resolve("/posts/edit/5/draft");
		expect(match).not.toBeNull();
		expect(match!.methodName).toBe("edit");
		expect(match!.params).toEqual(["5", "draft"]);
	});
});

describe("AutoRouter - 비활성화", () => {
	test("enabled: false → null 반환", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: false });
		const match = await ar.resolve("/posts");
		expect(match).toBeNull();
	});
});

describe("AutoRouter - 명시적 라우트 우선", () => {
	test("명시적 경로에 있으면 null", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		ar.setExplicitPaths(["/posts"]);
		const match = await ar.resolve("/posts");
		expect(match).toBeNull();
	});

	test("명시적 경로에 없으면 매칭", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		ar.setExplicitPaths(["/users"]);
		const match = await ar.resolve("/posts");
		expect(match).not.toBeNull();
	});
});

describe("AutoRouter - 제외 목록", () => {
	test("exclude에 포함되면 null", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true, exclude: ["posts"] });
		const match = await ar.resolve("/posts/show");
		expect(match).toBeNull();
	});

	test("exclude에 없으면 매칭", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true, exclude: ["users"] });
		const match = await ar.resolve("/posts");
		expect(match).not.toBeNull();
	});
});

describe("AutoRouter - 이름 변환", () => {
	test("controllerNameToFileBase: 복수형 → 단수형", () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		// 내부 메서드 테스트를 위해 any 캐스팅
		expect((ar as any).controllerNameToFileBase("posts")).toBe("post");
		expect((ar as any).controllerNameToFileBase("users")).toBe("user");
		expect((ar as any).controllerNameToFileBase("categories")).toBe("category");
	});

	test("controllerNameToFileBase: kebab → snake", () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		expect((ar as any).controllerNameToFileBase("post-categories")).toBe("post_category");
	});

	test("fileBaseToClassName: snake → PascalCase", () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		expect((ar as any).fileBaseToClassName("post")).toBe("Post");
		expect((ar as any).fileBaseToClassName("user")).toBe("User");
		expect((ar as any).fileBaseToClassName("post_category")).toBe("PostCategory");
	});
});

describe("AutoRouter - 메서드 필터링", () => {
	test("_ 로 시작하는 메서드는 제외", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		// welcome_controller에 _private 같은 메서드가 없다면
		// 존재하는 메서드(index)는 매칭됨
		const match = await ar.resolve("/welcome");
		expect(match).not.toBeNull();
		expect(match!.methodName).toBe("index");
	});
});

describe("AutoRouter - 설정", () => {
	test("getConfig", () => {
		const ar = new AutoRouter(APP_ROOT, {
			enabled: true,
			defaultController: "home",
			defaultMethod: "list",
		});
		const config = ar.getConfig();
		expect(config.enabled).toBe(true);
		expect(config.defaultController).toBe("home");
		expect(config.defaultMethod).toBe("list");
	});

	test("isEnabled", () => {
		const ar1 = new AutoRouter(APP_ROOT, { enabled: true });
		expect(ar1.isEnabled()).toBe(true);

		const ar2 = new AutoRouter(APP_ROOT, { enabled: false });
		expect(ar2.isEnabled()).toBe(false);
	});
});

describe("AutoRouter - 존재하지 않는 컨트롤러", () => {
	test("없는 컨트롤러 → null", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		const match = await ar.resolve("/nonexistent");
		expect(match).toBeNull();
	});

	test("없는 메서드 → null", async () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		const match = await ar.resolve("/welcome/nonexistent_method");
		expect(match).toBeNull();
	});
});

describe("AutoRouter - 단수화 규칙", () => {
	test("규칙형 복수형", () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		const s = (word: string) => (ar as any).singularize(word);
		expect(s("posts")).toBe("post");
		expect(s("users")).toBe("user");
		expect(s("categories")).toBe("category");
		expect(s("addresses")).toBe("address");
		expect(s("boxes")).toBe("box");
		expect(s("dishes")).toBe("dish");
	});

	test("불규칙 복수형", () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		const s = (word: string) => (ar as any).singularize(word);
		expect(s("people")).toBe("person");
		expect(s("men")).toBe("man");
		expect(s("children")).toBe("child");
	});

	test("이미 단수형", () => {
		const ar = new AutoRouter(APP_ROOT, { enabled: true });
		const s = (word: string) => (ar as any).singularize(word);
		expect(s("post")).toBe("post");
		expect(s("user")).toBe("user");
		expect(s("address")).toBe("address"); // ss로 끝남 → 단수형 유지
	});
});
