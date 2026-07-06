// ============================================================
// BunIgniter - Route Model Binding Tests
// ============================================================

import { beforeEach, describe, expect, test } from "bun:test";
import { Model } from "../system/core/model.ts";
import { RouteModelBinding } from "../system/core/route_model_binding.ts";

// 테스트용 모델
interface TestUser {
	id?: number;
	name?: string;
	email?: string;
}

class TestUserModel extends Model<TestUser> {
	override tableName = "test_users";
}

// 메모리 조회를 시뮬레이션하기 위해 findById를 오버라이드
class MockUserModel extends Model<TestUser> {
	override tableName = "mock_users";
	private users: TestUser[] = [
		{ id: 1, name: "Alice", email: "alice@test.com" },
		{ id: 2, name: "Bob", email: "bob@test.com" },
	];

	override async findById(id: number): Promise<TestUser | null> {
		return this.users.find((u) => u.id === id) ?? null;
	}

	override async findWhere(conditions: Partial<TestUser>): Promise<TestUser[]> {
		return this.users.filter((u) => {
			for (const [key, val] of Object.entries(conditions)) {
				if ((u as any)[key] !== val) return false;
			}
			return true;
		});
	}
}

describe("RouteModelBinding", () => {
	beforeEach(() => {
		RouteModelBinding.flush();
	});

	test("bind 바인딩 등록", () => {
		const model = new MockUserModel();
		RouteModelBinding.bind("user", model);
		expect(RouteModelBinding.has("user")).toBe(true);
		expect(RouteModelBinding.has("post")).toBe(false);
	});

	test("unbind 바인딩 제거", () => {
		const model = new MockUserModel();
		RouteModelBinding.bind("user", model);
		RouteModelBinding.unbind("user");
		expect(RouteModelBinding.has("user")).toBe(false);
	});

	test("resolve ID로 모델 조회", async () => {
		const model = new MockUserModel();
		RouteModelBinding.bind("user", model);

		const { params, notFound } = await RouteModelBinding.resolve({
			user: "1",
		});

		expect(notFound).toBeNull();
		expect(params.user).toEqual({
			id: 1,
			name: "Alice",
			email: "alice@test.com",
		});
	});

	test("resolve 존재하지 않는 ID → 404", async () => {
		const model = new MockUserModel();
		RouteModelBinding.bind("user", model);

		const { params, notFound } = await RouteModelBinding.resolve({
			user: "999",
		});

		expect(notFound).toBeTruthy();
	});

	test("resolve 바인딩 없는 파라미터는 그대로", async () => {
		const { params, notFound } = await RouteModelBinding.resolve({
			id: "42",
			slug: "hello",
		});

		expect(notFound).toBeNull();
		expect(params.id).toBe("42");
		expect(params.slug).toBe("hello");
	});

	test("getBindings 목록", () => {
		const model = new MockUserModel();
		RouteModelBinding.bind("user", model);
		RouteModelBinding.bind("post", model);

		const bindings = RouteModelBinding.getBindings();
		expect(bindings).toContain("user");
		expect(bindings).toContain("post");
	});
});
