// ============================================================
// BunIgniter - E2E/통합 테스트
// Router를 직접 호출하여 HTTP 요청/응답 흐름 검증
// 실행: bun test tests/e2e_test.ts
// ============================================================

import { describe, expect, test } from "bun:test";
import type { Context } from "../system/core/controller.ts";
import { Controller } from "../system/core/controller.ts";
import {
	assertBodyContains,
	assertRedirect,
	assertStatus,
	httpTest,
} from "../system/core/e2e_test.ts";
import { Router } from "../system/core/router.ts";

// ─── 테스트용 컨트롤러 ──────────────────────────────────

class UserController extends Controller {
	async index(_ctx: Context) {
		return this.json([{ id: 1, name: "Alice" }]);
	}

	async show({ params }: Context) {
		return this.json({ id: Number(params.id), name: "Alice" });
	}

	async create(_ctx: Context) {
		return this.view("users/create", { title: "회원가입" });
	}

	async store({ body }: Context) {
		const data = body();
		return this.json({ id: 2, ...data }, 201);
	}

	async update({ body, params }: Context) {
		const data = body();
		return this.json({ id: Number(params.id), ...data });
	}

	async delete({ params }: Context) {
		return this.json({ deleted: Number(params.id) });
	}
}

class AuthController extends Controller {
	async login(_ctx: Context) {
		return this.redirect("/dashboard");
	}
}

// _ErrorController: 테스트에서 미사용, 향후 커스텀 에러 테스트 시 사용
// class ErrorController extends Controller {
// 	async notFound(_ctx: Context) {
// 		return new Response("Custom 404 Page", { status: 404 });
// 	}
// }

// ─── 테스트 라우터 구성 ────────────────────────────────

function createTestRouter(): Router {
	const router = new Router();
	const users = new UserController();
	const auth = new AuthController();

	router.get("/users", users, "index");
	router.get("/users/:id", users, "show");
	router.get("/users/create", users, "create");
	router.post("/users", users, "store");
	router.put("/users/:id", users, "update");
	router.delete("/users/:id", users, "delete");

	router.post("/login", auth, "login");

	return router;
}

function createRouterWithCustom404(): Router {
	const router = new Router();

	router.notFound(async (_ctx) => {
		return new Response("Custom 404 Page", { status: 404 });
	});

	return router;
}

// ─── GET 요청 테스트 ────────────────────────────────────

describe("E2E - GET 요청", () => {
	const t = httpTest(createTestRouter());

	test("GET /users — 목록 조회", async () => {
		const res = await t.get("/users");
		assertStatus(res, 200);
		const data = res.json();
		expect(data).toEqual([{ id: 1, name: "Alice" }]);
	});

	test("GET /users/:id — 상세 조회", async () => {
		const res = await t.get("/users/42");
		assertStatus(res, 200);
		const data = res.json();
		expect(data.id).toBe(42);
		expect(data.name).toBe("Alice");
	});

	test("GET /users/create — 폼 페이지", async () => {
		const res = await t.get("/users/create");
		assertStatus(res, 200);
	});
});

// ─── POST 요청 테스트 ───────────────────────────────────

describe("E2E - POST 요청", () => {
	const t = httpTest(createTestRouter());

	test("POST /users — 리소스 생성", async () => {
		const res = await t.post("/users", { name: "Bob", email: "bob@test.com" });
		expect(res.status).toBe(201);
		const data = res.json();
		expect(data.id).toBe(2);
		expect(data.name).toBe("Bob");
		expect(data.email).toBe("bob@test.com");
	});

	test("POST /login — 리다이렉트", async () => {
		const res = await t.post("/login");
		assertRedirect(res, "/dashboard");
	});
});

// ─── PUT/PATCH/DELETE 요청 테스트 ───────────────────────

describe("E2E - PUT/DELETE 요청", () => {
	const t = httpTest(createTestRouter());

	test("PUT /users/:id — 리소스 수정", async () => {
		const res = await t.put("/users/1", { name: "Updated" });
		assertStatus(res, 200);
		const data = res.json();
		expect(data.id).toBe(1);
		expect(data.name).toBe("Updated");
	});

	test("DELETE /users/:id — 리소스 삭제", async () => {
		const res = await t.delete("/users/1");
		assertStatus(res, 200);
		const data = res.json();
		expect(data.deleted).toBe(1);
	});
});

// ─── 404 테스트 ─────────────────────────────────────────

describe("E2E - 404 응답", () => {
	test("기본 404 — JSON 요청", async () => {
		const t = httpTest(createTestRouter());
		const res = await t.get("/nonexistent", {
			headers: { Accept: "application/json" },
		});
		expect(res.status).toBe(404);
		const data = res.json();
		expect(data.error).toBe("Not Found");
	});

	test("기본 404 — HTML 요청", async () => {
		const t = httpTest(createTestRouter());
		const res = await t.get("/nonexistent");
		expect(res.status).toBe(404);
		expect(res.body).toContain("404");
	});

	test("커스텀 404 핸들러", async () => {
		const t = httpTest(createRouterWithCustom404());
		const res = await t.get("/nonexistent");
		expect(res.status).toBe(404);
		expect(res.body).toBe("Custom 404 Page");
	});
});

// ─── 405 Method Not Allowed 테스트 ─────────────────────

describe("E2E - 405 응답", () => {
	const t = httpTest(createTestRouter());

	test("미지원 메서드 → 405", async () => {
		// /login에 POST는 등록되어 있지만 GET은 없음
		const res = await t.get("/login");
		expect(res.status).toBe(405);
	});
});

// ─── 어설션 헬퍼 테스트 ────────────────────────────────

describe("E2E - 어설션 헬퍼", () => {
	test("assertStatus: 실패 시 에러 메시지", () => {
		expect(() => assertStatus({ status: 500, body: "err" } as any, 200)).toThrow(
			"Expected status 200",
		);
	});

	test("assertRedirect: 실패 시 에러 메시지", () => {
		expect(() =>
			assertRedirect({ status: 200, headers: new Headers(), body: "" } as any, "/login"),
		).toThrow("Expected redirect status");
	});

	test("assertBodyContains: 실패 시 에러 메시지", () => {
		expect(() => assertBodyContains({ body: "hello world" } as any, "missing")).toThrow(
			'Expected body to contain "missing"',
		);
	});
});
