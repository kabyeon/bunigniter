// ============================================================
// BunIgniter - URL 헬퍼
// CodeIgniter3 의 URL Helper 와 동일
// ============================================================

/**
 * 사이트 URL 생성
 * CI3: site_url('posts/1')
 */
export function siteUrl(path: string = ""): string {
	const base = process.env.BASE_URL ?? "http://localhost:3000";
	return `${base}/${path}`.replace(/\/+/g, "/").replace(":/", "://");
}

/**
 * 베이스 URL 반환
 * CI3: base_url()
 */
export function baseUrl(): string {
	return process.env.BASE_URL ?? "http://localhost:3000";
}

/**
 * 현재 요청 URL 반환
 * CI3: current_url()
 */
export function currentUrl(request: Request): string {
	return request.url;
}

/**
 * URL 리다이렉트 응답
 * CI3: redirect($url)
 */
export function redirect(url: string): Response {
	return new Response(null, {
		status: 302,
		headers: { Location: url },
	});
}
