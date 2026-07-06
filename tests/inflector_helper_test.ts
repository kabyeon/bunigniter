// ============================================================
// BunIgniter - Inflector Helper 테스트
// ============================================================

import { describe, expect, test } from "bun:test";
import {
	classify,
	humanize,
	pluralize,
	singularize,
	tableize,
} from "../system/helpers/inflector_helper.ts";

describe("Inflector Helper - pluralize", () => {
	test("기본 복수형 (s 추가)", () => {
		expect(pluralize("post")).toBe("posts");
		expect(pluralize("user")).toBe("users");
	});

	test("-y → -ies", () => {
		expect(pluralize("category")).toBe("categories");
		expect(pluralize("story")).toBe("stories");
	});

	test("-s/-x/-z/-ch/-sh → -es", () => {
		expect(pluralize("box")).toBe("boxes");
		expect(pluralize("bus")).toBe("buses");
		expect(pluralize("watch")).toBe("watches");
		expect(pluralize("dish")).toBe("dishes");
	});

	test("-f → -ves", () => {
		expect(pluralize("wolf")).toBe("wolves");
		expect(pluralize("leaf")).toBe("leaves");
	});

	test("-fe → -ves", () => {
		expect(pluralize("knife")).toBe("knives");
		expect(pluralize("life")).toBe("lives");
	});

	test("불규칙 복수형", () => {
		expect(pluralize("person")).toBe("people");
		expect(pluralize("child")).toBe("children");
		expect(pluralize("mouse")).toBe("mice");
		expect(pluralize("man")).toBe("men");
	});

	test("이미 복수형", () => {
		expect(pluralize("sheep")).toBe("sheep");
		expect(pluralize("fish")).toBe("fish");
	});

	test("대문자 보존", () => {
		expect(pluralize("User")).toBe("Users");
		expect(pluralize("POST")).toBe("POSTS");
	});
});

describe("Inflector Helper - singularize", () => {
	test("기본 단수형 (s 제거)", () => {
		expect(singularize("posts")).toBe("post");
		expect(singularize("users")).toBe("user");
	});

	test("-ies → -y", () => {
		expect(singularize("categories")).toBe("category");
		expect(singularize("stories")).toBe("story");
	});

	test("-ves → -f/-fe", () => {
		expect(singularize("wolves")).toBe("wolf");
		expect(singularize("knives")).toBe("knife");
		expect(singularize("lives")).toBe("life");
	});

	test("-ses/-xes/-ches/-shes → -s/-x/-ch/-sh", () => {
		expect(singularize("boxes")).toBe("box");
		expect(singularize("buses")).toBe("bus");
		expect(singularize("watches")).toBe("watch");
	});

	test("불규칙 단수형", () => {
		expect(singularize("people")).toBe("person");
		expect(singularize("children")).toBe("child");
		expect(singularize("mice")).toBe("mouse");
	});
});

describe("Inflector Helper - classify", () => {
	test("테이블명 → 모델명", () => {
		expect(classify("users")).toBe("User");
		expect(classify("posts")).toBe("Post");
	});

	test("복합 테이블명", () => {
		expect(classify("post_categories")).toBe("PostCategory");
		expect(classify("user_profiles")).toBe("UserProfile");
	});
});

describe("Inflector Helper - tableize", () => {
	test("모델명 → 테이블명", () => {
		expect(tableize("User")).toBe("users");
		expect(tableize("Post")).toBe("posts");
	});

	test("복합 모델명", () => {
		expect(tableize("PostCategory")).toBe("post_categories");
		expect(tableize("UserProfile")).toBe("user_profiles");
	});
});

describe("Inflector Helper - humanize", () => {
	test("snake_case → 사람이 읽기 쉬운 형태", () => {
		expect(humanize("user_name")).toBe("User name");
		expect(humanize("post_id")).toBe("Post id");
	});

	test("kebab-case", () => {
		expect(humanize("first-name")).toBe("First name");
	});
});
