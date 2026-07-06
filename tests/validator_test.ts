// ============================================================
// BunIgniter - Validator 테스트
// 실행: bun test tests/validator_test.ts
// ============================================================

import { describe, expect, test } from "bun:test";
import { Validator, validate } from "../system/core/validator.ts";

describe("Validator.check", () => {
	test("필수 필드 검증 - 빈 값", () => {
		const result = Validator.check({ name: "" }, { name: ["required"] });
		expect(result.valid).toBe(false);
		expect(result.errors[0].rule).toBe("required");
	});

	test("필수 필드 검증 - 값 있음", () => {
		const result = Validator.check({ name: "Alice" }, { name: ["required"] });
		expect(result.valid).toBe(true);
	});

	test("이메일 검증", () => {
		const result = Validator.check({ email: "invalid-email" }, { email: ["required", "email"] });
		expect(result.valid).toBe(false);
		expect(result.errors[0].rule).toBe("email");
	});

	test("이메일 검증 - 유효", () => {
		const result = Validator.check(
			{ email: "alice@example.com" },
			{ email: ["required", "email"] },
		);
		expect(result.valid).toBe(true);
	});

	test("최소 길이 검증", () => {
		const result = Validator.check({ password: "123" }, { password: ["required", "min:8"] });
		expect(result.valid).toBe(false);
	});

	test("최소 길이 검증 - 통과", () => {
		const result = Validator.check({ password: "12345678" }, { password: ["required", "min:8"] });
		expect(result.valid).toBe(true);
	});

	test("숫자 검증", () => {
		const result = Validator.check({ age: "not-a-number" }, { age: ["numeric"] });
		expect(result.valid).toBe(false);
	});

	test("정수 검증", () => {
		const result = Validator.check({ age: "25" }, { age: ["integer"] });
		expect(result.valid).toBe(true);
	});

	test("다중 필드 검증", () => {
		const result = Validator.check(
			{ name: "Alice", email: "", age: "abc" },
			{
				name: ["required"],
				email: ["required", "email"],
				age: ["integer"],
			},
		);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBe(2);
	});

	test("커스텀 메시지", () => {
		const result = Validator.check(
			{ name: "" },
			{ name: ["required"] },
			{ "name.required": "이름을 입력해주세요" },
		);
		expect(result.valid).toBe(false);
		expect(result.errors[0].message).toBe("이름을 입력해주세요");
	});
});

describe("validate (빠른 검증)", () => {
	test("파이프 구분자 규칙", () => {
		const result = validate({ email: "bad" }, { email: "required|email" });
		expect(result.valid).toBe(false);
	});

	test("모든 규칙 통과", () => {
		const result = validate(
			{ name: "Alice", email: "alice@test.com", age: "25" },
			{
				name: "required|min:2",
				email: "required|email",
				age: "integer|minValue:0",
			},
		);
		expect(result.valid).toBe(true);
	});
});

describe("Validator.validate (단일 값)", () => {
	test("이메일 규칙", () => {
		expect(Validator.validate("alice@test.com", ["email"])).toBe(true);
		expect(Validator.validate("invalid", ["email"])).toBe(false);
	});

	test("최소값 규칙", () => {
		expect(Validator.validate(10, ["minValue:5"])).toBe(true);
		expect(Validator.validate(3, ["minValue:5"])).toBe(false);
	});
});
