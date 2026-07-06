// ============================================================
// BunIgniter - CORS Middleware
// Cross-Origin Resource Sharing 미들웨어
// ============================================================

export interface CorsConfig {
	/** 허용 오리진 (기본값: "*") */
	origin: string | string[];
	/** 허용 HTTP 메서드 */
	methods: string[];
	/** 허용 헤더 */
	allowedHeaders: string[];
	/** 노출할 헤더 */
	exposedHeaders: string[];
	/** 크리덴셜 허용 */
	credentials: boolean;
	/** 프리플라이트 캐시 시간 (초) */
	maxAge: number;
}

const DEFAULT_CONFIG: CorsConfig = {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
	exposedHeaders: [],
	credentials: false,
	maxAge: 86400,
};

/**
 * CORS 미들웨어
 *
 * 사용법:
 *   import { corsMiddleware } from "system/core/cors.ts";
 *   router.use(corsMiddleware);
 *
 * 커스텀 설정:
 *   import { createCorsMiddleware } from "system/core/cors.ts";
 *   router.use(createCorsMiddleware({
 *     origin: ["https://example.com", "https://app.example.com"],
 *     credentials: true,
 *   }));
 */
export async function corsMiddleware({
	request,
	next,
}: {
	request: Request;
	response: any;
	next: () => Promise<Response | undefined>;
}): Promise<Response | undefined> {
	return handleCors(request, next, DEFAULT_CONFIG);
}

/**
 * 커스텀 설정으로 CORS 미들웨어 생성
 */
export function createCorsMiddleware(
	config: Partial<CorsConfig>,
): (ctx: {
	request: Request;
	response: any;
	next: () => Promise<Response | undefined>;
}) => Promise<Response | undefined> {
	const merged = { ...DEFAULT_CONFIG, ...config };
	return async ({ request, next }) => handleCors(request, next, merged);
}

/**
 * CORS 처리 로직
 */
async function handleCors(
	request: Request,
	next: () => Promise<Response | undefined>,
	config: CorsConfig,
): Promise<Response | undefined> {
	const origin = request.headers.get("origin") ?? "*";

	// 오리진 검증
	const allowedOrigin = getAllowedOrigin(origin, config.origin, config.credentials);

	// Preflight (OPTIONS) 요청 처리
	if (request.method === "OPTIONS") {
		const headers: Record<string, string> = {
			"Access-Control-Allow-Origin": allowedOrigin,
			"Access-Control-Allow-Methods": config.methods.join(", "),
			"Access-Control-Allow-Headers": config.allowedHeaders.join(", "),
			"Access-Control-Max-Age": String(config.maxAge),
		};

		if (config.credentials) {
			headers["Access-Control-Allow-Credentials"] = "true";
		}

		if (config.exposedHeaders.length > 0) {
			headers["Access-Control-Expose-Headers"] = config.exposedHeaders.join(", ");
		}

		return new Response(null, { status: 204, headers });
	}

	// 일반 요청: 다음 핸들러 실행 후 CORS 헤더 추가
	const result = await next();

	if (result instanceof Response) {
		const headers = new Headers(result.headers);
		headers.set("Access-Control-Allow-Origin", allowedOrigin);

		if (config.credentials) {
			headers.set("Access-Control-Allow-Credentials", "true");
		}

		if (config.exposedHeaders.length > 0) {
			headers.set("Access-Control-Expose-Headers", config.exposedHeaders.join(", "));
		}

		return new Response(result.body, {
			status: result.status,
			statusText: result.statusText,
			headers,
		});
	}

	return result;
}

/**
 * 허용된 오리진 판별
 *
 * ⚠️ 보안: credentials가 true이면 origin에 "*"를 사용할 수 없습니다.
 * 브라우저 스펙상 credentials + 와일드카드 조합은 차단됩니다.
 * credentials가 필요하면 명시적인 오리진 목록을 지정하세요.
 */
export function getAllowedOrigin(
	requestOrigin: string,
	allowedOrigins: string | string[],
	credentials: boolean = false,
): string {
	// credentials + wildcard 차단
	if (credentials && allowedOrigins === "*") {
		console.warn(
			'[BunIgniter CORS] credentials: true with origin: "*" is not allowed by browsers. Specify explicit origins.',
		);
		return ""; // 빈 값 반환 → 브라우저가 요청 차단
	}

	if (allowedOrigins === "*") return "*";

	if (Array.isArray(allowedOrigins)) {
		if (allowedOrigins.includes(requestOrigin)) {
			return requestOrigin;
		}
		// 일치하는 오리진이 없으면 빈 값 반환 (브라우저가 요청 차단)
		return "";
	}

	return allowedOrigins === requestOrigin ? requestOrigin : "";
}
