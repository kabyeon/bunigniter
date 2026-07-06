// ============================================================
// BunIgniter - CSRF Protection Middleware
// Bun.CSRF.generate() / Bun.CSRF.verify() 내장 사용
// HMAC 서명 + 만료 타임스탬프 포함
// ============================================================

/** CSRF 알고리즘 (Bun.CSRF 지원) */
export type CsrfAlgorithm =
	| "sha256"
	| "sha384"
	| "sha512"
	| "sha512-256"
	| "blake2b256"
	| "blake2b512";

/** CSRF 인코딩 (Bun.CSRF 지원) */
export type CsrfEncoding = "base64" | "base64url" | "hex";

/** CSRF 설정 */
export interface CsrfConfig {
	/** HMAC 서명용 시크릿 키 (미지정 시 스레드별 랜덤 키, 재시작 시 무효) */
	secret?: string;
	/** 토큰 만료 시간 (ms), 기본 86400000 (24시간) */
	expiresIn?: number;
	/** 토큰 검증 최대 수명 (ms), 기본 86400000 */
	maxAge?: number;
	/** HMAC 알고리즘 */
	algorithm?: CsrfAlgorithm;
	/** 토큰 인코딩 */
	encoding?: CsrfEncoding;
	/** 세션 바인딩: 토큰을 특정 사용자/세션에 바인딩 */
	sessionId?: string;
	/** CSRF 토큰 쿠키명 (JavaScript에서 읽을 수 있어야 하므로 HttpOnly=false) */
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
	expiresIn: 86400000, // 24시간
	maxAge: 86400000, // 24시간
	algorithm: "sha256",
	encoding: "base64url",
};

/**
 * CSRF 토큰 생성 (Bun.CSRF.generate)
 *
 * Bun 내장 HMAC 서명 + nonce + 타임스탬프 포함 토큰 생성.
 * Double Submit Cookie 방식에서는 이 토큰을 쿠키와 폼/헤더 양쪽에 전송합니다.
 *
 * @param config.secret HMAC 서명용 시크릿 (필수, 미지정 시 스레드별 랜덤 키 사용 — 프로덕션 권장)
 */
export function generateCsrfToken(config?: Partial<CsrfConfig>): string {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	return (Bun.CSRF as any).generate(cfg.secret, {
		expiresIn: cfg.expiresIn,
		encoding: cfg.encoding,
		algorithm: cfg.algorithm,
		sessionId: cfg.sessionId,
	});
}

/**
 * CSRF 토큰 검증 (Bun.CSRF.verify)
 *
 * @returns true if valid and not expired, false otherwise
 * @throws 빈 문자열 토큰 전달 시 throw (호출부에서 사전 검증 필요)
 */
export function verifyCsrfToken(token: string, config?: Partial<CsrfConfig>): boolean {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	return (Bun.CSRF as any).verify(token, {
		secret: cfg.secret,
		maxAge: cfg.maxAge,
		encoding: cfg.encoding,
		algorithm: cfg.algorithm,
		sessionId: cfg.sessionId,
	});
}

/**
 * 안전한 CSRF 토큰 검증 (빈 토큰/에러 시 false 반환)
 */
export function verifyCsrfTokenSafe(
	token: string | null | undefined,
	config?: Partial<CsrfConfig>,
): boolean {
	if (!token || typeof token !== "string" || token.length === 0) {
		return false;
	}
	try {
		return verifyCsrfToken(token, config);
	} catch (_err) {
		return false;
	}
}

/**
 * Double Submit Cookie 방식 CSRF 토큰 처리
 *
 * 1. GET 요청: 쿠키에 CSRF 토큰을 설정합니다.
 *    - 쿠키는 HttpOnly=false (JavaScript에서 읽을 수 있음)
 *    - JavaScript에서 쿠키 값을 읽어 헤더나 폼 필드로 전송
 *
 * 2. POST/PUT/PATCH/DELETE: 쿠키의 토큰과 요청의 토큰이 일치하는지 검증
 *    - Bun.CSRF.verify()로 서명 + 만료 검증
 */
export function getCsrfToken(
	request: Request,
	config?: Partial<CsrfConfig>,
): { token: string; cookieHeader: string } {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	const cookies = parseCookies(request);
	let token = cookies[cfg.cookieName];

	// 쿠키에 토큰이 있으면 서명 검증 (만료되었으면 새로 발급)
	if (token) {
		const valid = verifyCsrfTokenSafe(token, cfg);
		if (!valid) {
			token = null as any; // 만료 → 재발급
		}
	}

	if (!token) {
		token = generateCsrfToken(cfg);
	}

	const secureFlag = cfg.secure ? "; Secure" : "";
	const cookieHeader = `${cfg.cookieName}=${token}; Path=/; SameSite=${cfg.sameSite}${secureFlag}`;
	return { token, cookieHeader };
}

/**
 * CSRF 검증 미들웨어 (Double Submit Cookie + Bun.CSRF.verify)
 *
 * 동작 방식:
 *   GET 요청 → 쿠키에 CSRF 토큰 설정 (JavaScript에서 읽을 수 있음)
 *   POST/PUT/PATCH/DELETE → Bun.CSRF.verify()로 서명 + 만료 검증
 *
 * 사용법:
 *   1. 폼: <?= csrfField(csrfToken) ?>
 *   2. AJAX: 메타 태그에서 토큰 읽어 X-CSRF-Token 헤더로 전송
 *   3. 라우트: router.post("/form", controller, "store", [csrfMiddleware])
 */
export async function csrfMiddleware({
	request,
	next,
	config,
}: {
	request: Request;
	response: any;
	next: () => Promise<Response | undefined>;
	config?: Partial<CsrfConfig>;
}): Promise<Response | undefined> {
	const method = request.method.toUpperCase();

	// 안전한 메서드는 검증 없이 통과
	if (["GET", "HEAD", "OPTIONS"].includes(method)) {
		return next();
	}

	const cfg = { ...DEFAULT_CONFIG, ...config };

	// 쿠키에서 토큰 읽기
	const cookies = parseCookies(request);
	const cookieToken = cookies[cfg.cookieName];

	if (!cookieToken) {
		return new Response(JSON.stringify({ error: "CSRF token missing from cookies" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Bun.CSRF.verify()로 쿠키 토큰의 서명 + 만료 검증
	if (!verifyCsrfTokenSafe(cookieToken, cfg)) {
		return new Response(JSON.stringify({ error: "CSRF token expired or invalid" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
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
				(formData.get(cfg.tokenName) as string) ?? (formData.get("_token") as string) ?? null;
		} catch {
			// FormData가 아닌 경우
		}
	}

	// 3. 헤더
	if (!requestToken) {
		requestToken =
			request.headers.get("x-csrf-token") ?? request.headers.get("x-xsrf-token") ?? null;
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
	const escaped = escapeHtmlAttr(token);
	return `<input type="hidden" name="csrf_token" value="${escaped}" />`;
}

/**
 * 뷰에서 CSRF 메타 태그를 생성하는 헬퍼
 * AJAX 요청에서 사용: <meta name="csrf-token" content="..." />
 *
 * Double Submit Cookie 방식에서는 JavaScript가 쿠키에서도 토큰을 읽을 수 있지만,
 * 메타 태그 방식도 지원합니다.
 */
export function csrfMeta(token: string): string {
	const escaped = escapeHtmlAttr(token);
	return `<meta name="csrf-token" content="${escaped}" />`;
}

/**
 * HTML 속성값 이스케이프 (XSS 방지)
 * ", ', <, >, & 를 HTML 엔티티로 변환
 */
function escapeHtmlAttr(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
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
