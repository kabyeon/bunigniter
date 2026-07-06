// ============================================================
// BunIgniter - Helper Functions 테스트
// 실행: bun test tests/helpers_test.ts
// ============================================================

import { describe, expect, test } from "bun:test";
import {
	baseUrl,
	camelize,
	chunk,
	clamp,
	currentUrl,
	daysBetween,
	deepMerge,
	// Array
	element,
	elements,
	escapeHtml,
	flatten,
	formatBytes,
	formatCurrency,
	// Date
	formatDate,
	// Number
	formatNumber,
	formatPercent,
	fromTimestamp,
	groupBy,
	isToday,
	isValidDate,
	isYesterday,
	kebabCase,
	now,
	nowFormatted,
	pascalize,
	plural,
	randomElement,
	randomString,
	redirect,
	reduceMultiples,
	// URL
	siteUrl,
	// String
	slug,
	snakeCase,
	stripQuotes,
	timeAgo,
	toRoman,
	toTimestamp,
	truncate,
	ucwords,
	unescapeHtml,
	uniqueBy,
} from "../system/helpers/index.ts";

// ─── URL Helper ─────────────────────────────────────────

describe("URL Helper", () => {
	test("siteUrl: 경로 결합", () => {
		expect(siteUrl("posts/1")).toContain("posts/1");
	});

	test("siteUrl: 빈 경로", () => {
		expect(siteUrl()).toContain("localhost:3000");
	});

	test("baseUrl: 베이스 URL 반환", () => {
		expect(baseUrl()).toContain("localhost:3000");
	});

	test("currentUrl: 요청 URL 반환", () => {
		const req = new Request("https://example.com/posts?q=test");
		expect(currentUrl(req)).toBe("https://example.com/posts?q=test");
	});

	test("redirect: 302 리다이렉트 응답", () => {
		const res = redirect("/login");
		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toBe("/login");
	});
});

// ─── String Helper ───────────────────────────────────────

describe("String Helper - slug", () => {
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

describe("String Helper - truncate", () => {
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

describe("String Helper - escapeHtml", () => {
	test("HTML 이스케이프", () => {
		expect(escapeHtml("<script>alert('xss')</script>")).toBe(
			"&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
		);
	});

	test("앰퍼샌드 이스케이프", () => {
		expect(escapeHtml("a & b")).toBe("a &amp; b");
	});

	test("unescapeHtml: 디코딩", () => {
		expect(unescapeHtml("&lt;div&gt;")).toBe("<div>");
	});
});

describe("String Helper - 케이스 변환", () => {
	test("camelize", () => {
		expect(camelize("hello-world")).toBe("helloWorld");
		expect(camelize("foo_bar")).toBe("fooBar");
		expect(camelize("some text")).toBe("someText");
	});

	test("pascalize", () => {
		expect(pascalize("hello-world")).toBe("HelloWorld");
		expect(pascalize("foo_bar")).toBe("FooBar");
	});

	test("snakeCase", () => {
		expect(snakeCase("helloWorld")).toBe("hello_world");
		expect(snakeCase("HelloWorld")).toBe("hello_world");
	});

	test("kebabCase", () => {
		expect(kebabCase("helloWorld")).toBe("hello-world");
		expect(kebabCase("HelloWorld")).toBe("hello-world");
	});

	test("ucwords", () => {
		expect(ucwords("hello world")).toBe("Hello World");
	});
});

describe("String Helper - 기타", () => {
	test("stripQuotes", () => {
		expect(stripQuotes('"hello"')).toBe("hello");
		expect(stripQuotes("'test'")).toBe("test");
	});

	test("randomString: 길이 확인", () => {
		const s = randomString("alnum", 32);
		expect(s.length).toBe(32);
	});

	test("randomString: 타입별 문자", () => {
		const numeric = randomString("numeric", 10);
		expect(/^\d+$/.test(numeric)).toBe(true);
		const hex = randomString("hex", 10);
		expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
	});

	test("reduceMultiples", () => {
		expect(reduceMultiples("a||b||c", "|")).toBe("a|b|c");
		expect(reduceMultiples("||a||b||", "|", true)).toBe("a|b");
	});
});

// ─── Date Helper ─────────────────────────────────────────

describe("Date Helper - formatDate", () => {
	test("날짜 포맷", () => {
		const date = new Date("2025-07-05T15:30:45");
		expect(formatDate(date, "Y-m-d")).toBe("2025-07-05");
	});

	test("시간 포맷", () => {
		const date = new Date("2025-07-05T15:30:45");
		expect(formatDate(date, "H:i:s")).toBe("15:30:45");
	});
});

describe("Date Helper - timeAgo", () => {
	test("방금 전", () => {
		expect(timeAgo(new Date())).toBe("방금 전");
	});

	test("분 전", () => {
		const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
		expect(timeAgo(fiveMinAgo)).toBe("5분 전");
	});

	test("시간 전", () => {
		const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
		expect(timeAgo(threeHoursAgo)).toBe("3시간 전");
	});
});

describe("Date Helper - now/nowFormatted", () => {
	test("now: 타임스탬프 반환", () => {
		const ts = now();
		expect(typeof ts).toBe("number");
		expect(ts).toBeGreaterThan(0);
	});

	test("nowFormatted: 현재 시간 포맷", () => {
		const result = nowFormatted("Y-m-d");
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe("Date Helper - 유틸리티", () => {
	test("daysBetween", () => {
		const d1 = new Date("2025-01-01");
		const d2 = new Date("2025-01-11");
		expect(daysBetween(d1, d2)).toBe(10);
	});

	test("isValidDate", () => {
		expect(isValidDate("2025-01-01")).toBe(true);
		expect(isValidDate(new Date())).toBe(true);
		expect(isValidDate("invalid")).toBe(false);
	});

	test("isToday", () => {
		expect(isToday(new Date())).toBe(true);
		expect(isToday("2020-01-01")).toBe(false);
	});

	test("isYesterday", () => {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		expect(isYesterday(yesterday)).toBe(true);
	});

	test("toTimestamp / fromTimestamp 왕복", () => {
		const now = new Date();
		const ts = toTimestamp(now);
		const restored = fromTimestamp(ts);
		expect(Math.abs(restored.getTime() - now.getTime())).toBeLessThan(1000);
	});
});

// ─── Number Helper ───────────────────────────────────────

describe("Number Helper", () => {
	test("formatNumber: 천 단위 구분", () => {
		expect(formatNumber(1234567)).toContain("1,234,567");
	});

	test("formatCurrency: 원화 포맷", () => {
		expect(formatCurrency(50000)).toContain("50,000");
		expect(formatCurrency(50000)).toContain("원");
	});

	test("formatBytes", () => {
		expect(formatBytes(0)).toBe("0 B");
		expect(formatBytes(1024)).toBe("1.0 KB");
		expect(formatBytes(1048576)).toBe("1.0 MB");
		expect(formatBytes(1073741824)).toBe("1.0 GB");
	});

	test("formatPercent", () => {
		expect(formatPercent(25, 100)).toBe("25.0%");
		expect(formatPercent(1, 3)).toBe("33.3%");
		expect(formatPercent(0, 0)).toBe("0%");
	});

	test("plural", () => {
		expect(plural(1, "항목")).toBe("항목");
		expect(plural(0, "항목")).toBe("항목s");
		expect(plural(2, "item", "items")).toBe("items");
	});

	test("clamp", () => {
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(-5, 0, 10)).toBe(0);
		expect(clamp(15, 0, 10)).toBe(10);
	});

	test("toRoman", () => {
		expect(toRoman(1)).toBe("I");
		expect(toRoman(4)).toBe("IV");
		expect(toRoman(9)).toBe("IX");
		expect(toRoman(2025)).toBe("MMXXV");
	});
});

// ─── Array Helper ────────────────────────────────────────

describe("Array Helper - element/elements", () => {
	test("element: 객체에서 요소 가져오기", () => {
		expect(element("name", { name: "Alice", age: 25 })).toBe("Alice");
	});

	test("element: 기본값 반환", () => {
		expect(element("missing", { name: "Alice" }, "default")).toBe("default");
	});

	test("element: 배열에서 인덱스 접근", () => {
		expect(element(1, ["a", "b", "c"])).toBe("b");
	});

	test("elements: 여러 요소 가져오기", () => {
		const result = elements(["name", "age"], { name: "Alice", age: 25, city: "Seoul" });
		expect(result).toEqual(["Alice", 25]);
	});
});

describe("Array Helper - randomElement", () => {
	test("랜덤 요소 반환", () => {
		const arr = [1, 2, 3, 4, 5];
		const result = randomElement(arr);
		expect(arr).toContain(result);
	});
});

describe("Array Helper - groupBy", () => {
	test("키로 그룹핑", () => {
		const items = [
			{ type: "fruit", name: "apple" },
			{ type: "veggie", name: "carrot" },
			{ type: "fruit", name: "banana" },
		];
		const result = groupBy(items, "type");
		expect(result.fruit.length).toBe(2);
		expect(result.veggie.length).toBe(1);
	});
});

describe("Array Helper - uniqueBy", () => {
	test("키로 중복 제거", () => {
		const items = [
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 1, name: "c" },
		];
		const result = uniqueBy(items, "id");
		expect(result.length).toBe(2);
	});
});

describe("Array Helper - chunk", () => {
	test("청크 분할", () => {
		expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	test("정확히 나누어떨어지는 경우", () => {
		expect(chunk([1, 2, 3, 4], 2)).toEqual([
			[1, 2],
			[3, 4],
		]);
	});
});

describe("Array Helper - flatten", () => {
	test("1단계 플래튼", () => {
		expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
	});
});

describe("Array Helper - deepMerge", () => {
	test("깊은 병합", () => {
		const target: Record<string, any> = { a: 1, b: { c: 2, d: 3 } };
		const source: Record<string, any> = { b: { c: 99, e: 5 }, f: 6 };
		const result = deepMerge(target, source as any);
		expect(result.a).toBe(1);
		expect(result.b.c).toBe(99);
		expect(result.b.d).toBe(3);
		expect(result.b.e).toBe(5);
		expect(result.f).toBe(6);
	});
});
