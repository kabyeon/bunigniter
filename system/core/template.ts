// ============================================================
// BunIgniter - Template Engine
// rendu 제거 → 자체 구현 (Bun native 최대 활용)
// PHP/CI3 친화적: {{ }}, <?= ?>, <? ?>, include(), 슬롯
// ============================================================

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getAppRoot } from "./config.ts";

/** HTML 특수문자 이스케이프 (XSS 방지) */
export function escapeHtml(s: string): string {
	return String(s).replace(/[&<>"']/g, (c) => {
		const map: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return map[c] ?? c;
	});
}

// ─── 템플릿 파서 ──────────────────────────────────

type TokenType = "text" | "expr" | "raw_expr" | "code";

interface Token {
	type: TokenType;
	value: string;
}

/**
 * 템플릿 문자열을 토큰 배열로 파싱
 *
 * 지원 문법:
 *   {{ expr }}    → 이스케이프 출력 (escapeHtml 자동 적용)
 *   {{{ expr }}}  → raw 출력 (이스케이프 없음)
 *   <?= expr ?>   → raw 출력 (이스케이프 없음)
 *   <? code ?>    → 제어문 (for, if, etc.)
 */
export function parseTemplate(template: string): Token[] {
	if (!template) return [];

	const tokens: Token[] = [];
	let cursor = 0;

	// {{{ raw }}} 를 먼저 보호 ({{ 보다 먼저 매칭)
	const processed = template.replace(
		/\{\{\{\s*([\s\S]+?)\s*\}\}\}/g,
		(_m, expr: string) => `__RAW_START__${expr.trim()}__RAW_END__`,
	);

	// 전체 토큰화: <?= ?>, <? ?>, {{ }}, __RAW__, 일반 텍스트
	const re =
		/<\?(?:js)?(?<equals>=)?(?<codeValue>[\s\S]*?)\?>|\{\{\s*([\s\S]+?)\s*\}\}|__RAW_START__([\s\S]+?)__RAW_END__/g;

	let match: RegExpExecArray | null;
	while ((match = re.exec(processed)) !== null) {
		if (match.index > cursor) {
			const text = processed.slice(cursor, match.index);
			if (text) tokens.push({ type: "text", value: text });
		}

		const full = match[0];

		if (full.startsWith("<?")) {
			const equals = match.groups?.equals;
			const codeValue = match.groups?.codeValue;
			if (equals) {
				tokens.push({ type: "raw_expr", value: codeValue?.trim() ?? "" });
			} else {
				tokens.push({ type: "code", value: codeValue?.trim() ?? "" });
			}
		} else if (full.startsWith("{{") && !full.startsWith("__RAW")) {
			tokens.push({ type: "expr", value: match[3]?.trim() ?? "" });
		} else if (full.startsWith("__RAW_START__")) {
			tokens.push({ type: "raw_expr", value: match[4]?.trim() ?? "" });
		}

		cursor = match.index + full.length;
	}

	if (cursor < processed.length) {
		const remaining = processed.slice(cursor);
		if (remaining) tokens.push({ type: "text", value: remaining });
	}

	return tokens;
}

// ─── 템플릿 컴파일러 ────────────────────────────────

function compileTokensToString(tokens: Token[]): string {
	const parts: string[] = [];

	for (const token of tokens) {
		switch (token.type) {
			case "text":
				parts.push(`echo(${JSON.stringify(token.value)})`);
				break;
			case "expr":
				// {{ expr }} → 자동 이스케이프
				parts.push(`echo(__escape__(${token.value}))`);
				break;
			case "raw_expr":
				// <?= expr ?>, {{{ expr }}} → raw 출력
				parts.push(`echo(${token.value})`);
				break;
			case "code":
				parts.push(token.value);
				break;
		}
	}

	return parts.join("\n");
}

/**
 * 템플릿 문자열을 렌더 함수로 컴파일
 *
 * 컴파일된 함수 내부에서 사용 가능한 내장 함수/변수:
 *   echo(chunk)           — 출력 버퍼에 추가
 *   include(path, data?)  — 다른 템플릿 포함
 *   escapeHtml(s)         — HTML 특수문자 이스케이프
 *   __escape__(s)         — escapeHtml 별칭 ({{ }}에서 자동 사용)
 */
export function compileTemplate(
	template: string,
): (
	context: Record<string, any>,
	includeFn?: (path: string, data?: Record<string, any>) => Promise<string>,
	escapeFn?: (s: string) => string,
) => Promise<string> {
	const tokens = parseTemplate(template);
	const body = compileTokensToString(tokens);

	// with() 안에서 정의되지 않은 변수는 ReferenceError 발생
	// → try/catch로 빈 문자열 대체 (CI3의 관대한 동작과 동일)
	const fullBody = [
		"const __chunks__ = [];",
		"const echo = (chunk) => { __chunks__.push(chunk); };",
		"const __escape__ = __escapeFn__;",
		"const escapeHtml = __escapeFn__;",
		"const include = async (path, extraData) => {",
		"  const result = await __include__(path, extraData);",
		"  __chunks__.push(result);",
		"};",
		"const __ctx__ = Object.assign(Object.create(null), __context__, {",
		"  echo, include, escapeHtml, __escape__,",
		"});",
		"const __proxy__ = new Proxy(__ctx__, {",
		"  has() { return true; },",
		"  get(target, prop, _receiver) {",
		"    if (prop === Symbol.unscopables) return undefined;",
		"    if (prop in target) return target[prop];",
		"    return globalThis[prop];",
		"  },",
		"});",
		"with(__proxy__) {",
		body,
		"}",
		"let __out__ = '';",
		"for (let chunk of __chunks__) {",
		"  if (typeof chunk === 'function') chunk = chunk();",
		"  if (chunk instanceof Promise) chunk = await chunk;",
		"  __out__ += typeof chunk === 'string' ? chunk : String(chunk ?? '');",
		"}",
		"return __out__;",
	].join("\n");

	const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
	try {
		return new AsyncFunction("__context__", "__include__", "__escapeFn__", fullBody) as (
			context: Record<string, any>,
			includeFn?: (path: string, data?: Record<string, any>) => Promise<string>,
			escapeFn?: (s: string) => string,
		) => Promise<string>;
	} catch (error: any) {
		throw new SyntaxError(`Template syntax error: ${error.message}`);
	}
}

// ─── 템플릿 캐시 ───────────────────────────────────

const templateCache: Record<string, any> = {};

function getCachedTemplate(
	key: string,
	template: string,
	env: string = process.env.NODE_ENV ?? "development",
): (
	context: Record<string, any>,
	includeFn?: (path: string, data?: Record<string, any>) => Promise<string>,
	escapeFn?: (s: string) => string,
) => Promise<string> {
	if (!templateCache[key] || env === "development") {
		templateCache[key] = compileTemplate(template);
	}
	return templateCache[key];
}

/** 템플릿 캐시 초기화 (테스트용) */
export function clearTemplateCache(): void {
	for (const key of Object.keys(templateCache)) {
		delete templateCache[key];
	}
}

// ─── include() 지원 ───────────────────────────────

async function renderInclude(
	path: string,
	extraData?: Record<string, any>,
	contextData?: Record<string, any>,
): Promise<string> {
	const appRoot = getAppRoot();
	const fullPath = join(appRoot, "views", `${path}.html`);

	if (!existsSync(fullPath)) {
		return `<!-- View not found: ${path} -->`;
	}

	const template = readFileSync(fullPath, "utf-8");
	const data = { ...contextData, ...extraData };
	return renderTemplateString(template, data);
}

async function renderTemplateString(template: string, data: Record<string, any>): Promise<string> {
	const env = process.env.NODE_ENV ?? "development";
	const cacheKey = `str:${template.slice(0, 80)}`;

	const render = getCachedTemplate(cacheKey, template, env);
	const includeFn = (path: string, extraData?: Record<string, any>) =>
		renderInclude(path, extraData, data);

	return render(data, includeFn, escapeHtml);
}

// ─── 슬롯 시스템 ───────────────────────────────────

/**
 * 자식 뷰에서 슬롯 정의 추출
 *
 * 자식 뷰 문법:
 *   <!-- slot:title -->My Page Title<!-- endslot -->
 *   (본문 내용 = 자동으로 content 슬롯)
 *
 * 레이아웃에서 사용:
 *   {{{ content }}}              — 본문 내용
 *   {{{ slot:title }}}           — 이름 슬롯
 *   {{{ slot:title || "기본" }}} — 기본값 지원
 */
function extractSlots(viewContent: string): {
	slots: Record<string, string>;
	body: string;
} {
	const slots: Record<string, string> = {};

	const slotRe = /<!--\s*slot:(\w+)\s*-->([\s\S]*?)<!--\s*endslot\s*-->/g;
	let match: RegExpExecArray | null;

	while ((match = slotRe.exec(viewContent)) !== null) {
		slots[match[1]] = match[2].trim();
	}

	const processed = viewContent.replace(slotRe, "").trim();
	return { slots, body: processed };
}

function applySlots(layoutTemplate: string, slots: Record<string, string>): string {
	let result = layoutTemplate;

	// {{{ slot:name || "default" }}}
	result = result.replace(
		/\{\{\{\s*slot:(\w+)\s*\|\|\s*"([^"]*)"\s*\}\}\}/g,
		(_m, name: string, defaultVal: string) => slots[name] ?? defaultVal,
	);

	// {{{ slot:name }}}
	result = result.replace(/\{\{\{\s*slot:(\w+)\s*\}\}\}/g, (_m, name: string) => {
		return slots[name] ?? "";
	});

	// {{{ content }}}
	result = result.replace(/\{\{\{\s*content\s*\}\}\}/g, slots.content ?? "");

	return result;
}

// ─── 메인 렌더 함수 ─────────────────────────────────

/**
 * 뷰 템플릿을 렌더링합니다.
 * CodeIgniter3: $this->load->view('welcome_message', $data)
 *
 * 템플릿 문법:
 *   {{ expr }}                  → 이스케이프 출력
 *   {{{ expr }}}                → raw 출력
 *   <?= expr ?>                 → raw 출력
 *   <?= escapeHtml(x) ?>        → 명시적 이스케이프
 *   <? code ?>                  → 제어문 (for, if, etc.)
 *
 * 레이아웃/슬롯:
 *   <!-- layout:default -->                   → 레이아웃 지정
 *   <!-- slot:title -->...<!-- endslot -->     → 슬롯 정의
 *   {{{ slot:title || "기본" }}}              → 슬롯 출력
 *   {{{ content }}}                           → 본문 출력
 *
 * include:
 *   <? include('partials/header') ?>          → 다른 템플릿 포함
 */
export async function renderView(
	viewPath: string,
	data: Record<string, any> = {},
	_request?: Request,
): Promise<Response> {
	const appRoot = getAppRoot();
	const fullPath = join(appRoot, "views", `${viewPath}.html`);

	if (!existsSync(fullPath)) {
		return new Response("View not found", { status: 500 });
	}

	let viewContent = readFileSync(fullPath, "utf-8");

	// 레이아웃 감지
	const layoutMatch = viewContent.match(/<!--\s*layout:(\w+)\s*-->/);
	const layoutName = layoutMatch?.[1] ?? null;

	if (layoutMatch) {
		viewContent = viewContent.replace(layoutMatch[0], "").trim();
	}

	let finalTemplate: string;

	if (layoutName) {
		const layoutPath = join(appRoot, "views", "layout", `${layoutName}.html`);

		if (existsSync(layoutPath)) {
			const layoutContent = readFileSync(layoutPath, "utf-8");
			const { slots, body } = extractSlots(viewContent);

			if (!slots.content) {
				slots.content = body;
			}

			finalTemplate = applySlots(layoutContent, slots);
		} else {
			finalTemplate = viewContent;
		}
	} else {
		finalTemplate = viewContent;
	}

	const html = await renderTemplateString(finalTemplate, data);

	return new Response(html, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}
