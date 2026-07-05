// ============================================================
// BunIgniter - Helper Functions 테스트
// 실행: bun test tests/helpers_test.ts
// ============================================================

import { describe, test, expect } from "bun:test";
import {
	slug,
	truncate,
	escapeHtml,
	formatDate,
	timeAgo,
	formatNumber,
	formatCurrency,
	plural,
	siteUrl,
} from "../system/helpers/index.ts";

describe("slug", () => {
	test("공백을 하이픈으로", () => {
		expect(slug("Hello World")).toBe("hello-world");
	});

	test("한글 유지", () => {
		expect(slug("안녕하세요")).toBe("안녕하세요");
	});

	test("특수문자 제거", () => {
		expect(slug("Hello! World@#")).toBe("hello-world");
	});
});

describe("truncate", () => {
	test("짧은 문자열은 그대로", () => {
		expect(truncate("Hello", 10)).toBe("Hello");
	});

	test("긴 문자열 자르기", () => {
		expect(truncate("Hello World!", 5)).toBe("Hello...");
	});

	test("커스텀 접미사", () => {
		expect(truncate("Hello World!", 5, "→")).toBe("Hello→");
	});
});

describe("escapeHtml", () => {
	test("HTML 이스케이프", () => {
		expect(escapeHtml("<script>alert('xss')</script>")).toBe(
			"&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
		);
	});

	test("앰퍼샌드 이스케이프", () => {
		expect(escapeHtml("a & b")).toBe("a &amp; b");
	});
});

describe("formatDate", () => {
	test("날짜 포맷", () => {
		const date = new Date("2025-07-05T15:30:45");
		const result = formatDate(date, "Y-m-d");
		expect(result).toBe("2025-07-05");
	});

	test("시간 포맷", () => {
		const date = new Date("2025-07-05T15:30:45");
		const result = formatDate(date, "H:i:s");
		expect(result).toBe("15:30:45");
	});
});

describe("timeAgo", () => {
	test("방금 전", () => {
		expect(timeAgo(new Date())).toBe("방금 전");
	});

	test("분 전", () => {
		const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
		expect(timeAgo(fiveMinAgo)).toBe("5분 전");
	});
});

describe("formatNumber", () => {
	test("숫자 포맷", () => {
		expect(formatNumber(1234567)).toContain("1,234,567");
	});
});

describe("formatCurrency", () => {
	test("통화 포맷", () => {
		expect(formatCurrency(50000)).toContain("50,000");
		expect(formatCurrency(50000)).toContain("원");
	});
});

describe("plural", () => {
	test("단수", () => {
		expect(plural(1, "항목")).toBe("항목");
	});

	test("복수 기본", () => {
		expect(plural(0, "항목")).toBe("항목s");
	});

	test("복수 커스텀", () => {
		expect(plural(2, "item", "items")).toBe("items");
	});
});

describe("siteUrl", () => {
	test("경로 결합", () => {
		const url = siteUrl("posts/1");
		expect(url).toContain("posts/1");
	});
});
