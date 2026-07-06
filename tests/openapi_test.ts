// ============================================================
// BunIgniter - OpenAPI Generator Tests
// ============================================================

import { describe, expect, test } from "bun:test";
import { Controller } from "../system/core/controller.ts";
import { OpenApiGenerator } from "../system/core/openapi.ts";
import { Router } from "../system/core/router.ts";

class TestController extends Controller {}

describe("OpenApiGenerator", () => {
	const controller = new TestController();
	const router = new Router();
	router.get("/users", controller, "index");
	router.post("/users", controller, "store");
	router.get("/users/:id", controller, "show");
	router.put("/users/:id", controller, "update");
	router.delete("/users/:id", controller, "delete");

	const generator = new OpenApiGenerator({
		info: { title: "Test API", version: "1.0.0" },
		servers: [{ url: "http://localhost:3000" }],
	});

	test("기본 스펙 구조", () => {
		const spec = generator.generate(router);

		expect(spec.openapi).toBe("3.0.0");
		expect(spec.info.title).toBe("Test API");
		expect(spec.info.version).toBe("1.0.0");
		expect(spec.servers[0].url).toBe("http://localhost:3000");
	});

	test("paths 변환", () => {
		const spec = generator.generate(router);

		expect(spec.paths["/users"]).toBeDefined();
		expect(spec.paths["/users"].get).toBeDefined();
		expect(spec.paths["/users"].post).toBeDefined();
		expect(spec.paths["/users/{id}"]).toBeDefined();
		expect(spec.paths["/users/{id}"].get).toBeDefined();
		expect(spec.paths["/users/{id}"].put).toBeDefined();
		expect(spec.paths["/users/{id}"].delete).toBeDefined();
	});

	test("경로 파라미터 변환 (:id → {id})", () => {
		const spec = generator.generate(router);

		const showPath = spec.paths["/users/{id}"];
		expect(showPath).toBeDefined();
		expect(showPath.get.parameters).toBeDefined();

		const idParam = showPath.get.parameters.find((p: any) => p.name === "id");
		expect(idParam).toBeDefined();
		expect(idParam.in).toBe("path");
		expect(idParam.required).toBe(true);
	});

	test("POST에 requestBody 포함", () => {
		const spec = generator.generate(router);

		expect(spec.paths["/users"].post.requestBody).toBeDefined();
		expect(spec.paths["/users"].post.requestBody.content["application/json"]).toBeDefined();
	});

	test("describe 커스터마이징", () => {
		generator.describe("GET", "/users", {
			summary: "사용자 목록 조회",
			tags: ["Users"],
			responses: { "200": { description: "성공" } },
		});

		const spec = generator.generate(router);
		expect(spec.paths["/users"].get.summary).toBe("사용자 목록 조회");
		expect(spec.paths["/users"].get.tags).toContain("Users");
	});

	test("toJson JSON 문자열 생성", () => {
		const json = generator.toJson(router);
		expect(typeof json).toBe("string");
		expect(json.length).toBeGreaterThan(0);
		// JSON 유효성 검증
		try {
			const parsed = JSON.parse(json);
			expect(parsed.openapi).toBe("3.0.0");
		} catch {
			expect(true).toBe(false); // JSON 파싱 실패 시 테스트 실패
		}
	});

	test("swaggerUiHtml HTML 생성", () => {
		const html = generator.swaggerUiHtml("/api/docs/json");
		expect(html).toContain("swagger-ui");
		expect(html).toContain("Test API");
	});

	test("태그 자동 추출", () => {
		const spec = generator.generate(router);
		expect(spec.tags).toBeDefined();
		expect(spec.tags.length).toBeGreaterThan(0);
	});
});
