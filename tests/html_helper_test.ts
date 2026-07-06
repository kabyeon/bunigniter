// ============================================================
// BunIgniter - HTML Helper 테스트
// ============================================================

import { describe, expect, test } from "bun:test";
import {
	anchor,
	anchorPopup,
	br,
	heading,
	img,
	mailto,
	meta,
	nbsp,
	ol,
	script,
	style,
	ul,
} from "../system/helpers/html_helper.ts";

describe("HTML Helper - anchor", () => {
	test("기본 링크", () => {
		const html = anchor("/posts", "포스트");
		expect(html).toContain("<a");
		expect(html).toContain("포스트");
	});

	test("전체 URL", () => {
		const html = anchor("https://example.com", "Example");
		expect(html).toContain('href="https://example.com"');
	});

	test("속성 객체", () => {
		const html = anchor("/posts", "포스트", { class: "btn", id: "link" });
		expect(html).toContain('class="btn"');
		expect(html).toContain('id="link"');
	});
});

describe("HTML Helper - anchorPopup", () => {
	test("target=_blank", () => {
		const html = anchorPopup("/posts", "새 창");
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});
});

describe("HTML Helper - mailto", () => {
	test("이메일 링크", () => {
		const html = mailto("me@example.com", "이메일");
		expect(html).toContain('href="mailto:me@example.com"');
		expect(html).toContain("이메일");
	});
});

describe("HTML Helper - img", () => {
	test("이미지 태그", () => {
		const html = img("/images/logo.png", "로고");
		expect(html).toContain('src="/images/logo.png"');
		expect(html).toContain('alt="로고"');
	});
});

describe("HTML Helper - heading", () => {
	test("h1 태그", () => {
		const html = heading("환영합니다", 1);
		expect(html).toContain("<h1");
		expect(html).toContain("환영합니다");
	});

	test("h3 태그", () => {
		const html = heading("제목", 3);
		expect(html).toContain("<h3");
	});
});

describe("HTML Helper - 목록", () => {
	test("ul", () => {
		const html = ul(["사과", "바나나"]);
		expect(html).toContain("<ul");
		expect(html).toContain("<li>사과</li>");
	});

	test("ol", () => {
		const html = ol(["첫째", "둘째"]);
		expect(html).toContain("<ol");
	});
});

describe("HTML Helper - br/nbsp", () => {
	test("br", () => {
		expect(br(3)).toBe("<br /><br /><br />");
	});

	test("nbsp", () => {
		expect(nbsp(2)).toBe("&nbsp;&nbsp;");
	});
});

describe("HTML Helper - meta", () => {
	test("메타 태그", () => {
		const html = meta("description", "My site");
		expect(html).toContain('name="description"');
		expect(html).toContain('content="My site"');
	});

	test("property 메타", () => {
		const html = meta("og:title", "제목", "property");
		expect(html).toContain('property="og:title"');
	});
});

describe("HTML Helper - style/script", () => {
	test("style 태그", () => {
		const html = style("/css/app.css");
		expect(html).toContain('rel="stylesheet"');
		expect(html).toContain('href="/css/app.css"');
	});

	test("script 태그", () => {
		const html = script("/js/app.js");
		expect(html).toContain('src="/js/app.js"');
	});
});
