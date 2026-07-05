// ============================================================
// BunIgniter - Cookie Helper
// Bun.Cookie / Bun.CookieMap 내장 기능 활용
// CI3의 $this->input->cookie() 대체
// ============================================================

// ─── 쿠키 읽기/쓰기 헬퍼 ──────────────────────────────

/**
 * 요청에서 쿠키 읽기
 * Bun.CookieMap 내장 사용
 *
 * 사용법:
 *   const theme = getCookie(request, "theme");         // "dark"
 *   const all = getCookies(request);                    // { theme: "dark", lang: "ko" }
 */
export function getCookie(request: Request, name: string): string | null {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return null;

	const cookies = new Bun.CookieMap(cookieHeader);
	return cookies.get(name);
}

/**
 * 모든 쿠키 읽기
 */
export function getCookies(request: Request): Record<string, string> {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return {};

	const cookies = new Bun.CookieMap(cookieHeader);
	return cookies.toJSON();
}

/**
 * 쿠키 존재 여부
 */
export function hasCookie(request: Request, name: string): boolean {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return false;

	const cookies = new Bun.CookieMap(cookieHeader);
	return cookies.has(name);
}

// ─── 쿠키 생성 헬퍼 ──────────────────────────────────

export interface CookieOptions {
	/** 도메인 */
	domain?: string;
	/** 경로 (기본값: "/") */
	path?: string;
	/** 만료 시각 */
	expires?: Date | number | string;
	/** 최대 수명 (초) */
	maxAge?: number;
	/** HTTPS에서만 전송 */
	secure?: boolean;
	/** JavaScript에서 접근 불가 */
	httpOnly?: boolean;
	/** SameSite 정책 */
	sameSite?: "strict" | "lax" | "none";
	/** 파티션드 쿠키 (CHIPS) */
	partitioned?: boolean;
}

/**
 * 쿠키 Set-Cookie 헤더 값 생성
 * Bun.Cookie 내장 사용
 *
 * 사용법:
 *   const header = setCookie("session", "abc123", { httpOnly: true, maxAge: 3600 });
 *   // "session=abc123; Path=/; Max-Age=3600; HttpOnly; SameSite=lax"
 *
 *   // 응답에 적용:
 *   return new Response(body, { headers: { "Set-Cookie": header } });
 */
export function setCookie(
	name: string,
	value: string,
	options?: CookieOptions,
): string {
	const cookie = new Bun.Cookie(name, value, {
		domain: options?.domain,
		path: options?.path ?? "/",
		expires: options?.expires,
		maxAge: options?.maxAge,
		secure: options?.secure ?? false,
		httpOnly: options?.httpOnly ?? false,
		sameSite: options?.sameSite ?? "lax",
		partitioned: options?.partitioned ?? false,
	});
	return cookie.serialize();
}

/**
 * 쿠키 삭제 (과거 만료 설정)
 */
export function deleteCookie(
	name: string,
	options?: { domain?: string; path?: string },
): string {
	const cookie = new Bun.Cookie(name, "", {
		path: options?.path ?? "/",
		domain: options?.domain,
		expires: new Date(0),
		maxAge: 0,
	});
	return cookie.serialize();
}

/**
 * 여러 쿠키를 Set-Cookie 헤더 배열로 생성
 */
export function setCookies(
	cookies: Array<{ name: string; value: string; options?: CookieOptions }>,
): string[] {
	return cookies.map((c) => setCookie(c.name, c.value, c.options));
}

// ─── 쿠키 파싱 ────────────────────────────────────────

/**
 * 쿠키 문자열 파싱
 * Bun.Cookie.parse() 내장 사용
 */
export function parseCookie(cookieString: string): {
	name: string;
	value: string;
	domain?: string;
	path: string;
	secure: boolean;
	httpOnly: boolean;
	sameSite: string;
	maxAge?: number;
	expires?: Date;
	isExpired: boolean;
} {
	const cookie = Bun.Cookie.parse(cookieString);
	return {
		name: cookie.name,
		value: cookie.value,
		domain: cookie.domain ?? undefined,
		path: cookie.path,
		secure: cookie.secure,
		httpOnly: cookie.httpOnly,
		sameSite: cookie.sameSite,
		maxAge: cookie.maxAge ?? undefined,
		expires: cookie.expires ?? undefined,
		isExpired: cookie.isExpired(),
	};
}

/**
 * 쿠키 만료 여부 확인
 */
export function isCookieExpired(cookieString: string): boolean {
	const cookie = Bun.Cookie.parse(cookieString);
	return cookie.isExpired();
}
