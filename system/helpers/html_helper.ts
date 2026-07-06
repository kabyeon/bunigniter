// ============================================================
// BunIgniter - HTML 헬퍼
// CodeIgniter3 의 HTML Helper 와 동일
// ============================================================

import { escapeHtml } from "./string_helper.ts";
import { siteUrl } from "./url_helper.ts";

/**
 * 하이퍼링크 생성
 * CI3: anchor('posts/1', '포스트 보기', 'class="btn"')
 *
 * @param uri URL 또는 경로
 * @param text 링크 텍스트
 * @param attributes HTML 속성 (문자열 또는 객체)
 */
export function anchor(
	uri: string,
	text: string = "",
	attributes: Record<string, string> | string = {},
): string {
	const url = uri.startsWith("http") || uri.startsWith("/") ? uri : siteUrl(uri);
	const label = text || url;
	const attrStr = typeof attributes === "string" ? attributes : attrString(attributes);
	return `<a href="${escapeHtml(url)}" ${attrStr}>${escapeHtml(label)}</a>`;
}

/**
 * 새 창으로 열리는 하이퍼링크
 * CI3: anchor_popup('posts/1', '보기', $attributes)
 */
export function anchorPopup(
	uri: string,
	text: string = "",
	attributes: Record<string, string> = {},
): string {
	attributes.target = "_blank";
	if (!attributes.rel) attributes.rel = "noopener noreferrer";
	return anchor(uri, text, attributes);
}

/**
 * 메일 링크 생성
 * CI3: mailto('me@example.com', '이메일', 'class="link"')
 */
export function mailto(
	email: string,
	text: string = "",
	attributes: Record<string, string> = {},
): string {
	const label = text || email;
	return `<a href="mailto:${escapeHtml(email)}" ${attrString(attributes)}>${escapeHtml(label)}</a>`;
}

/**
 * 이미지 태그 생성
 * CI3: img('images/logo.png', '로고', 'class="img-fluid"')
 */
export function img(
	src: string,
	alt: string = "",
	attributes: Record<string, string> = {},
): string {
	const attrs: Record<string, string> = { src, alt, ...attributes };
	return `<img ${attrString(attrs)} />`;
}

/**
 * 제목 태그 생성
 * CI3: heading('환영합니다', 1, 'class="title"')
 */
export function heading(
	text: string,
	level: number = 1,
	attributes: Record<string, string> = {},
): string {
	const tag = `h${Math.min(Math.max(level, 1), 6)}`;
	return `<${tag} ${attrString(attributes)}>${escapeHtml(text)}</${tag}>`;
}

/**
 * 순서 없는 목록 생성
 * CI3: ul($list, $attributes)
 */
export function ul(items: string[], attributes: Record<string, string> = {}): string {
	const listItems = items.map((item) => `  <li>${escapeHtml(item)}</li>`).join("\n");
	return `<ul ${attrString(attributes)}>\n${listItems}\n</ul>`;
}

/**
 * 순서 있는 목록 생성
 * CI3: ol($list, $attributes)
 */
export function ol(items: string[], attributes: Record<string, string> = {}): string {
	const listItems = items.map((item) => `  <li>${escapeHtml(item)}</li>`).join("\n");
	return `<ol ${attrString(attributes)}>\n${listItems}\n</ol>`;
}

/**
 * 줄바꿈 태그
 * CI3: br(3) → <br /><br /><br />
 */
export function br(count: number = 1): string {
	return "<br />".repeat(count);
}

/**
 * 논블랭킹 스페이스
 * CI3: nbsp(3) → &nbsp;&nbsp;&nbsp;
 */
export function nbsp(count: number = 1): string {
	return "&nbsp;".repeat(count);
}

/**
 * 메타 태그 생성
 * CI3: meta('description', 'My site')
 */
export function meta(
	name: string,
	content: string,
	type: "name" | "http-equiv" | "property" = "name",
): string {
	return `<meta ${type}="${escapeHtml(name)}" content="${escapeHtml(content)}" />`;
}

/**
 * 스타일 태그
 */
export function style(href: string, attributes: Record<string, string> = {}): string {
	const attrs: Record<string, string> = { rel: "stylesheet", href, ...attributes };
	return `<link ${attrString(attrs)} />`;
}

/**
 * 스크립트 태그
 */
export function script(src: string, attributes: Record<string, string> = {}): string {
	const attrs: Record<string, string> = { src, ...attributes };
	return `<script ${attrString(attrs)}></script>`;
}

// ─── 유틸리티 ──────────────────────────────────────────

/**
 * 속성 객체를 문자열로 변환
 */
function attrString(attributes: Record<string, string>): string {
	return Object.entries(attributes)
		.filter(([, v]) => v !== undefined && v !== "")
		.map(([k, v]) => `${escapeHtml(k)}="${escapeHtml(v)}"`)
		.join(" ");
}
