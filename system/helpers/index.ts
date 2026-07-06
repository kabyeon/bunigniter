// ============================================================
// BunIgniter - Helper Functions
// CodeIgniter3 의 helper 와 동일
// ============================================================

/**
 * URL 헬퍼
 */
export function siteUrl(path: string = ""): string {
	const base = process.env.BASE_URL ?? "http://localhost:3000";
	return `${base}/${path}`.replace(/\/+/g, "/").replace(":/", "://");
}

export function baseUrl(): string {
	return process.env.BASE_URL ?? "http://localhost:3000";
}

export function currentUrl(request: Request): string {
	return request.url;
}

export function redirect(url: string): Response {
	return new Response(null, {
		status: 302,
		headers: { Location: url },
	});
}

/**
 * 문자열 헬퍼
 */
export function slug(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9가-힣]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function truncate(str: string, length: number = 100, suffix: string = "..."): string {
	if (str.length <= length) return str;
	return str.slice(0, length) + suffix;
}

export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * 배열/객체 헬퍼
 */
export function plural(count: number, singular: string, pluralStr?: string): string {
	return count === 1 ? singular : (pluralStr ?? `${singular}s`);
}

export function formatNumber(num: number): string {
	return num.toLocaleString("ko-KR");
}

export function formatCurrency(amount: number): string {
	return `${amount.toLocaleString("ko-KR")}원`;
}

/**
 * 날짜 헬퍼
 */
export function formatDate(date: Date | string, format: string = "Y-m-d H:i:s"): string {
	const d = typeof date === "string" ? new Date(date) : date;

	const map: Record<string, string> = {
		Y: d.getFullYear().toString(),
		m: (d.getMonth() + 1).toString().padStart(2, "0"),
		d: d.getDate().toString().padStart(2, "0"),
		H: d.getHours().toString().padStart(2, "0"),
		i: d.getMinutes().toString().padStart(2, "0"),
		s: d.getSeconds().toString().padStart(2, "0"),
	};

	let result = format;
	for (const [key, val] of Object.entries(map)) {
		result = result.replace(key, val);
	}
	return result;
}

export function timeAgo(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

	if (seconds < 60) return "방금 전";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
	if (seconds < 2592000) return `${Math.floor(seconds / 86400)}일 전`;
	return formatDate(d, "Y-m-d");
}
