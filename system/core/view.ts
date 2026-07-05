// ============================================================
// BunIgniter - View Renderer
// Rendu 템플릿 엔진 기반 + 레이아웃 시스템
// ============================================================

import { compileTemplate, createRenderContext } from "rendu";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const APP_ROOT = join(import.meta.dir, "..", "..", "app");

/** 템플릿 캐시 */
const templateCache: Record<string, any> = {};

/**
 * 뷰 템플릿을 렌더링합니다.
 * CodeIgniter3: $this->load->view('welcome_message', $data)
 *
 * 레이아웃 시스템:
 * - 뷰에 <!-- layout:default --> 주석이 있으면 해당 레이아웃 사용
 * - 레이아웃에 {{{ content }}} 위치에 뷰 내용 삽입
 */
export async function renderView(
	viewPath: string,
	data: Record<string, any> = {},
	request?: Request,
): Promise<Response> {
	const fullPath = join(APP_ROOT, "views", `${viewPath}.html`);

	if (!existsSync(fullPath)) {
		return new Response(`View not found: ${viewPath}`, { status: 500 });
	}

	let viewContent = readFileSync(fullPath, "utf-8");

	// 레이아웃 감지: <!-- layout:name --> 주석에서 레이아웃 이름 추출
	const layoutMatch = viewContent.match(/<!--\s*layout:(\w+)\s*-->/);
	const layoutName = layoutMatch?.[1] ?? null;

	// 레이아웃 주석 제거
	if (layoutMatch) {
		viewContent = viewContent.replace(layoutMatch[0], "").trim();
	}

	// 레이아웃이 있으면 결합
	let finalTemplate: string;
	if (layoutName) {
		const layoutPath = join(APP_ROOT, "views", "layout", `${layoutName}.html`);

		if (existsSync(layoutPath)) {
			const layoutContent = readFileSync(layoutPath, "utf-8");
			// 레이아웃의 {{{ content }}} 자리에 뷰 삽입
			finalTemplate = layoutContent.replace(
				/\{\{\{\s*content\s*\}\}\}/,
				viewContent,
			);
		} else {
			finalTemplate = viewContent;
		}
	} else {
		finalTemplate = viewContent;
	}

	// 템플릿 캐시 (개발 환경에서는 캐시 안함)
	const cacheKey = `${viewPath}-${layoutName ?? "none"}`;
	const env = process.env.NODE_ENV ?? "development";

	if (!templateCache[cacheKey] || env === "development") {
		templateCache[cacheKey] = compileTemplate(finalTemplate, { stream: false });
	}

	const render = templateCache[cacheKey];

	// Rendu 렌더 컨텍스트 생성 (htmlspecialchars 등 포함)
	const ctx = createRenderContext({
		request,
		context: data,
	});

	const html = await render(ctx);

	return new Response(html, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}
