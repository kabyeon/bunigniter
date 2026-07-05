// ============================================================
// BunIgniter - CSRF Protection Middleware
// Double Submit Cookie 방식
// 쿠키에 서명된 토큰을 저장하고, 요청 시 쿠키 토큰과
// 전송된 토큰이 일치하는지 검증합니다.
// ============================================================

/** CSRF 설정 */
export interface CsrfConfig {
	/** CSRF 토큰 쿠키명 (HttpOnly=false, JavaScript에서 읽기 가능) */
	cookieName: string;
	/** 폼 필드명 / 헤더명 */
	tokenName: string;
	/** 쿠키 SameSite 설정 */
	sameSite: "Strict" | "Lax" | "None";
	/** 쿠키 Secure 플래그 (HTTPS에서만) */
	secure: boolean;
}

const DEFAULT_CONFIG: CsrfConfig = {
	cookieName: "csrf_token",
	tokenName: "csrf_token",
	sameSite: "Lax",
	secure: false,
};

/** CSRF 토큰 생성 (32바이트 난수) */
export function generateCsrfToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Double Submit Cookie 방식 CSRF 토큰 처리
 *
 * 1. GET 요청: 쿠키에 CSRF 토큰을 설정합니다.
 *    - 쿠키는 HttpOnly=false (JavaScript에서 읽을 수 있음)
 *    - JavaScript에서 쿠키 값을 읽어 헤더나 폼 필드로 전송
 *
 * 2. POST/PUT/PATCH/DELETE: 쿠키의 토큰과 요청의 토큰이 일치하는지 검증
 */
export function getCsrfToken(
	request: Request,
	config?: Partial<CsrfConfig>,
): { token: string; cookieHeader: string } {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	const cookies = parseCookies(request);
	let token = cookies[cfg.cookieName];

	if (!token) {
		token = generateCsrfToken();
	}

	const secureFlag = cfg.secure ? "; Secure" : "";
	const cookieHeader = `${cfg.cookieName}=${token}; Path=/; SameSite=${cfg.sameSite}${secureFlag}`;
	return { token, cookieHeader };
}

/**
 * CSRF 검증 미들웨어 (Double Submit Cookie)
 *
 * 동작 방식:
 *   GET 요청 → 쿠키에 CSRF 토큰 설정 (JavaScript에서 읽을 수 있음)
 *   POST/PUT/PATCH/DELETE → 쿠키 토큰 == 요청 토큰 검증
 *
 * 사용법:
 *   1. 폼: <?= csrfField(csrfToken) ?>
 *   2. AJAX: 메타 태그에서 토큰 읽어 X-CSRF-Token 헤더로 전송
 *   3. 라우트: router.post("/form", controller, "store", [csrfMiddleware])
 */
export async function csrfMiddleware({
	request,
	next,
}: {
	request: Request;
	response: any;
	next: () => Promise<Response | void>;
}): Promise<Response | void> {
	const method = request.method.toUpperCase();

	// 안전한 메서드는 검증 없이 통과
	if (["GET", "HEAD", "OPTIONS"].includes(method)) {
		return next();
	}

	// 쿠키에서 토큰 읽기
	const cfg = DEFAULT_CONFIG;
	const cookies = parseCookies(request);
	const cookieToken = cookies[cfg.cookieName];

	if (!cookieToken) {
		return new Response(
			JSON.stringify({ error: "CSRF token missing from cookies" }),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// 요청에서 토큰 찾기
	let requestToken: string | null = null;

	// 1. 본문 (JSON)
	try {
		const body = await request.clone().json();
		requestToken = body?.[cfg.tokenName] ?? body?._token ?? null;
	} catch {
		// JSON이 아닌 경우
	}

	// 2. 폼 데이터
	if (!requestToken) {
		try {
			const formData = await request.clone().formData();
			requestToken =
				(formData.get(cfg.tokenName) as string) ??
				(formData.get("_token") as string) ??
				null;
		} catch {
			// FormData가 아닌 경우
		}
	}

	// 3. 헤더
	if (!requestToken) {
		requestToken =
			request.headers.get("x-csrf-token") ??
			request.headers.get("x-xsrf-token") ??
			null;
	}

	// 4. 쿼리 파라미터
	if (!requestToken) {
		try {
			const url = new URL(request.url);
			requestToken = url.searchParams.get(cfg.tokenName);
		} catch {
			// URL 파싱 실패
		}
	}

	// Double Submit Cookie 검증: 쿠키 토큰 == 요청 토큰
	if (!requestToken || requestToken !== cookieToken) {
		return new Response(JSON.stringify({ error: "CSRF token mismatch" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}

	return next();
}

/**
 * 뷰에서 CSRF hidden input을 생성하는 헬퍼
 * 템플릿에서 사용: <?= csrfField(csrfToken) ?>
 */
export function csrfField(token: string): string {
	return `<input type="hidden" name="csrf_token" value="${token}" />`;
}

/**
 * 뷰에서 CSRF 메타 태그를 생성하는 헬퍼
 * AJAX 요청에서 사용: <meta name="csrf-token" content="..." />
 *
 * Double Submit Cookie 방식에서는 JavaScript가 쿠키에서도 토큰을 읽을 수 있지만,
 * 메타 태그 방식도 지원합니다.
 */
export function csrfMeta(token: string): string {
	return `<meta name="csrf-token" content="${token}" />`;
}

function parseCookies(request: Request): Record<string, string> {
	const cookieHeader = request.headers.get("cookie") ?? "";
	const cookies: Record<string, string> = {};
	for (const pair of cookieHeader.split(";")) {
		const [key, ...rest] = pair.split("=");
		if (key) cookies[key.trim()] = rest.join("=").trim();
	}
	return cookies;
}
