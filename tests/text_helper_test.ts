// ============================================================
// BunIgniter - Text Helper 테스트
// ============================================================

import { describe, expect, test } from "bun:test";
import {
	asciiOnly,
	autoLink,
	characterLimiter,
	convertAccentedChars,
	ellipsize,
	highlightPhrase,
	nl2br,
	wordCensor,
	wordLimiter,
} from "../system/helpers/text_helper.ts";

describe("Text Helper - wordLimiter", () => {
	test("단어 수 제한", () => {
		const result = wordLimiter("Hello World This Is A Test", 3);
		expect(result).toContain("Hello World This");
	});

	test("제한 미만이면 그대로", () => {
		expect(wordLimiter("Hello World", 5)).toBe("Hello World");
	});
});

describe("Text Helper - characterLimiter", () => {
	test("글자 수 제한", () => {
		const result = characterLimiter("Hello World!", 5);
		expect(result).toContain("&hellip;");
		expect(result.length).toBeLessThanOrEqual(20); // 본문 + HTML 엔티티 접미사
	});

	test("제한 미만이면 그대로", () => {
		expect(characterLimiter("Hello", 10)).toBe("Hello");
	});
});

describe("Text Helper - asciiOnly", () => {
	test("한글 제거", () => {
		expect(asciiOnly("Hello안녕")).toBe("Hello");
	});

	test("ASCII만 있으면 그대로", () => {
		expect(asciiOnly("Hello World 123")).toBe("Hello World 123");
	});
});

describe("Text Helper - convertAccentedChars", () => {
	test("악센트 제거", () => {
		expect(convertAccentedChars("café")).toBe("cafe");
		expect(convertAccentedChars("résumé")).toBe("resume");
	});
});

describe("Text Helper - wordCensor", () => {
	test("금지어 필터", () => {
		const result = wordCensor("This is bad and awful", ["bad", "awful"], "***");
		expect(result).toBe("This is *** and ***");
	});

	test("부분 매치 아님", () => {
		const result = wordCensor("badminton is fun", ["bad"], "***");
		expect(result).toBe("badminton is fun");
	});
});

describe("Text Helper - highlightPhrase", () => {
	test("구문 하이라이트", () => {
		const result = highlightPhrase("Hello World Hello", "Hello");
		expect(result).toContain("<mark>Hello</mark>");
	});

	test("빈 구문", () => {
		expect(highlightPhrase("Hello", "")).toBe("Hello");
	});
});

describe("Text Helper - ellipsize", () => {
	test("짧은 문자열은 그대로", () => {
		expect(ellipsize("Hello", 10)).toBe("Hello");
	});

	test("앞 말줄임", () => {
		const result = ellipsize("Hello World!", 8, 0);
		expect(result).toContain("&hellip;");
	});

	test("뒤 말줄임", () => {
		const result = ellipsize("Hello World!", 8, 1);
		expect(result).toContain("&hellip;");
	});

	test("가운데 말줄임", () => {
		const result = ellipsize("Hello World!", 8, 0.5);
		expect(result).toContain("&hellip;");
	});
});

describe("Text Helper - autoLink", () => {
	test("URL 자동 링크", () => {
		const result = autoLink("Visit https://example.com for more");
		expect(result).toContain('<a href="https://example.com"');
	});

	test("이메일 자동 링크", () => {
		const result = autoLink("Contact me@example.com");
		expect(result).toContain("mailto:me@example.com");
	});
});

describe("Text Helper - nl2br", () => {
	test("줄바꿈 변환", () => {
		expect(nl2br("Line1\nLine2")).toContain("Line1<br />");
	});
});
