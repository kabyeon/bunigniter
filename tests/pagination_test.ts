// ============================================================
// BunIgniter - Pagination 테스트
// 실행: bun test tests/pagination_test.ts
// ============================================================

import { describe, expect, test } from "bun:test";
import { paginationHtml, paginationInfo, paginationMeta } from "../system/core/pagination.ts";

describe("paginationHtml", () => {
	test("단일 페이지면 빈 문자열", () => {
		const html = paginationHtml({
			data: [],
			total: 5,
			page: 1,
			perPage: 15,
			totalPages: 1,
		});
		expect(html).toBe("");
	});

	test("여러 페이지면 HTML 생성", () => {
		const html = paginationHtml({
			data: [],
			total: 100,
			page: 1,
			perPage: 15,
			totalPages: 7,
		});
		expect(html).toContain("pagination");
		expect(html).toContain("1");
		expect(html).toContain("7");
	});

	test("현재 페이지 활성 표시", () => {
		const html = paginationHtml({
			data: [],
			total: 100,
			page: 3,
			perPage: 15,
			totalPages: 7,
		});
		expect(html).toContain("pagination__item--active");
	});
});

describe("paginationInfo", () => {
	test("정보 텍스트", () => {
		const info = paginationInfo({
			data: [],
			total: 150,
			page: 2,
			perPage: 15,
			totalPages: 10,
		});
		expect(info).toContain("150");
		expect(info).toContain("16-30");
		expect(info).toContain("2/10");
	});

	test("빈 결과", () => {
		const info = paginationInfo({
			data: [],
			total: 0,
			page: 1,
			perPage: 15,
			totalPages: 0,
		});
		expect(info).toContain("0");
	});
});

describe("paginationMeta", () => {
	test("메타데이터", () => {
		const meta = paginationMeta({
			data: [],
			total: 100,
			page: 3,
			perPage: 15,
			totalPages: 7,
		});
		expect(meta.current_page).toBe(3);
		expect(meta.has_prev).toBe(true);
		expect(meta.has_next).toBe(true);
		expect(meta.prev_page).toBe(2);
		expect(meta.next_page).toBe(4);
	});

	test("첫 페이지", () => {
		const meta = paginationMeta({
			data: [],
			total: 100,
			page: 1,
			perPage: 15,
			totalPages: 7,
		});
		expect(meta.has_prev).toBe(false);
		expect(meta.prev_page).toBe(null);
	});

	test("마지막 페이지", () => {
		const meta = paginationMeta({
			data: [],
			total: 100,
			page: 7,
			perPage: 15,
			totalPages: 7,
		});
		expect(meta.has_next).toBe(false);
		expect(meta.next_page).toBe(null);
	});
});
