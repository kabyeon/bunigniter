// ============================================================
// BunIgniter - CSRF Protection Middleware
// CodeIgniter3 의 CSRF 보호와 동일
// ============================================================

/** CSRF 토큰 생성 */
export function generateCsrfToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * CSRF 토큰을 쿠키에서 읽거나 새로 생성
 */
export function getCsrfToken(request: Request): {
	token: string;
	cookieHeader: string;
} {
	const cookieName = "csrf_token";
	const cookies = parseCookies(request);
	let token = cookies[cookieName];

	if (!token) {
		token = generateCsrfToken();
	}

	const cookieHeader = `${cookieName}=${token}; Path=/; SameSite=Lax; HttpOnly`;
	return { token, cookieHeader };
}

/**
 * CSRF 검증 미들웨어
 * POST/PUT/PATCH/DELETE 요청에 대해 토큰을 검증합니다.
 *
 * 사용법:
 *   1. 폼에 hidden 필드 추가: <input type="hidden" name="csrf_token" value="{{ csrfToken }}" />
 *   2. 라우트에 미들웨어 적용: router.post("/form", controller, "store", [csrfMiddleware])
 *
 * 토큰 전달 방법 (우선순위):
 *   1. 요청 본문의 csrf_token 필드
 *   2. X-CSRF-Token 헤더
 *   3. csrf_token 쿼리 파라미터
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
	const { token: cookieToken } = getCsrfToken(request);
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

	// 1. 본문에서 찾기
	try {
		const body = await request.clone().json();
		requestToken = body?.csrf_token ?? body?._token ?? null;
	} catch {
		// JSON이 아닌 경우
	}

	// 2. 폼 데이터에서 찾기
	if (!requestToken) {
		try {
			const formData = await request.clone().formData();
			requestToken =
				(formData.get("csrf_token") as string) ??
				(formData.get("_token") as string) ??
				null;
		} catch {
			// FormData가 아닌 경우
		}
	}

	// 3. 헤더에서 찾기
	if (!requestToken) {
		requestToken =
			request.headers.get("x-csrf-token") ??
			request.headers.get("x-xsrf-token") ??
			null;
	}

	// 4. 쿼리 파라미터에서 찾기
	if (!requestToken) {
		try {
			const url = new URL(request.url);
			requestToken = url.searchParams.get("csrf_token");
		} catch {
			// URL 파싱 실패
		}
	}

	// 토큰 검증
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
