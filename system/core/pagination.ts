// ============================================================
// BunIgniter - Pagination View Helper
// 페이지네이션 HTML 렌더링 헬퍼
// ============================================================

export interface PaginationData {
	data: any[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
}

export interface PaginationOptions {
	/** 페이지네이션 표시할 최대 페이지 수 (기본: 5) */
	maxPages?: number;
	/** 이전 버튼 텍스트 (기본: "← 이전") */
	prevText?: string;
	/** 다음 버튼 텍스트 (기본: "다음 →") */
	nextText?: string;
	/** CSS 클래스 접두사 (기본: "pagination") */
	classPrefix?: string;
	/** URL 패턴 (기본: "?page={page}") */
	urlPattern?: string;
	/** 첫 페이지/마지막 페이지 버튼 표시 (기본: true) */
	showFirstLast?: boolean;
	/** 첫 페이지 텍스트 */
	firstText?: string;
	/** 마지막 페이지 텍스트 */
	lastText?: string;
}

/**
 * 페이지네이션 HTML 생성
 *
 * 컨트롤러:
 *   const result = await model.paginate(page, 15);
 *   return this.view("posts/index", { posts: result.data, pagination: result });
 *
 * 뷰:
 *   <?= paginationHtml(pagination) ?>
 */
export function paginationHtml(
	pagination: PaginationData,
	options: PaginationOptions = {},
): string {
	const {
		maxPages = 5,
		prevText = "← 이전",
		nextText = "다음 →",
		classPrefix = "pagination",
		urlPattern = "?page={page}",
		showFirstLast = true,
		firstText = "« 처음",
		lastText = "마지막 »",
	} = options;

	const { page, totalPages } = pagination;

	if (totalPages <= 1) return "";

	const pages = getPageRange(page, totalPages, maxPages);

	let html = `<nav class="${classPrefix}" role="navigation" aria-label="페이지네이션">`;
	html += `<ul class="${classPrefix}__list">`;

	// 처음 페이지
	if (showFirstLast && page > 1) {
		html += `<li class="${classPrefix}__item ${classPrefix}__item--first">`;
		html += `<a href="${buildUrl(urlPattern, 1)}" class="${classPrefix}__link">${firstText}</a>`;
		html += `</li>`;
	}

	// 이전 페이지
	if (page > 1) {
		html += `<li class="${classPrefix}__item ${classPrefix}__item--prev">`;
		html += `<a href="${buildUrl(urlPattern, page - 1)}" class="${classPrefix}__link" rel="prev">${prevText}</a>`;
		html += `</li>`;
	}

	// 페이지 번호
	for (const p of pages) {
		if (p === "...") {
			html += `<li class="${classPrefix}__item ${classPrefix}__item--ellipsis"><span class="${classPrefix}__ellipsis">…</span></li>`;
		} else {
			const active = p === page ? ` ${classPrefix}__item--active` : "";
			const ariaCurrent = p === page ? ' aria-current="page"' : "";
			html += `<li class="${classPrefix}__item${active}"${ariaCurrent}>`;
			html += `<a href="${buildUrl(urlPattern, p)}" class="${classPrefix}__link">${p}</a>`;
			html += `</li>`;
		}
	}

	// 다음 페이지
	if (page < totalPages) {
		html += `<li class="${classPrefix}__item ${classPrefix}__item--next">`;
		html += `<a href="${buildUrl(urlPattern, page + 1)}" class="${classPrefix}__link" rel="next">${nextText}</a>`;
		html += `</li>`;
	}

	// 마지막 페이지
	if (showFirstLast && page < totalPages) {
		html += `<li class="${classPrefix}__item ${classPrefix}__item--last">`;
		html += `<a href="${buildUrl(urlPattern, totalPages)}" class="${classPrefix}__link">${lastText}</a>`;
		html += `</li>`;
	}

	html += `</ul></nav>`;

	return html;
}

/**
 * 페이지네이션 정보 텍스트 생성
 * 예: "총 150건 중 1-15건 (1/10 페이지)"
 */
export function paginationInfo(pagination: PaginationData): string {
	const { total, page, perPage, totalPages } = pagination;
	const from = total === 0 ? 0 : (page - 1) * perPage + 1;
	const to = Math.min(page * perPage, total);
	return `총 ${total}건 중 ${from}-${to}건 (${page}/${totalPages} 페이지)`;
}

/**
 * API 응답용 페이지네이션 메타데이터
 */
export function paginationMeta(pagination: PaginationData): Record<string, any> {
	const { total, page, perPage, totalPages } = pagination;
	return {
		current_page: page,
		per_page: perPage,
		total,
		total_pages: totalPages,
		has_prev: page > 1,
		has_next: page < totalPages,
		prev_page: page > 1 ? page - 1 : null,
		next_page: page < totalPages ? page + 1 : null,
	};
}

/**
 * 페이지 범위 계산 (현재 페이지 중심)
 */
function getPageRange(
	current: number,
	total: number,
	maxVisible: number,
): (number | "...")[] {
	if (total <= maxVisible) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}

	const half = Math.floor(maxVisible / 2);
	let start = Math.max(1, current - half);
	const end = Math.min(total, start + maxVisible - 1);

	// 끝이 total에 닿으면 start를 앞으로 당김
	if (end === total) {
		start = Math.max(1, end - maxVisible + 1);
	}

	const pages: (number | "...")[] = [];

	if (start > 1) {
		pages.push(1);
		if (start > 2) pages.push("...");
	}

	for (let i = start; i <= end; i++) {
		pages.push(i);
	}

	if (end < total) {
		if (end < total - 1) pages.push("...");
		pages.push(total);
	}

	return pages;
}

/**
 * URL 패턴에 페이지 번호 삽입
 */
function buildUrl(pattern: string, page: number): string {
	return pattern.replace("{page}", String(page));
}
