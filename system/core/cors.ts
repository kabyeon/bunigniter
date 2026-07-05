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
	allowedHeaders: [
		"Content-Type",
		"Authorization",
		"X-CSRF-Token",
		"X-Requested-With",
	],
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
	next: () => Promise<Response | void>;
}): Promise<Response | void> {
	return handleCors(request, next, DEFAULT_CONFIG);
}

/**
 * 커스텀 설정으로 CORS 미들웨어 생성
 */
export function createCorsMiddleware(
	config: Partial<CorsConfig>,
): (ctx: { request: Request; response: any; next: () => Promise<Response | void> }) => Promise<Response | void> {
	const merged = { ...DEFAULT_CONFIG, ...config };
	return async ({ request, next }) => handleCors(request, next, merged);
}

/**
 * CORS 처리 로직
 */
async function handleCors(
	request: Request,
	next: () => Promise<Response | void>,
	config: CorsConfig,
): Promise<Response | void> {
	const origin = request.headers.get("origin") ?? "*";

	// 오리진 검증
	const allowedOrigin = getAllowedOrigin(origin, config.origin);

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
			headers["Access-Control-Expose-Headers"] =
				config.exposedHeaders.join(", ");
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
			headers.set(
				"Access-Control-Expose-Headers",
				config.exposedHeaders.join(", "),
			);
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
 */
function getAllowedOrigin(
	requestOrigin: string,
	allowedOrigins: string | string[],
): string {
	if (allowedOrigins === "*") return "*";

	if (Array.isArray(allowedOrigins)) {
		if (allowedOrigins.includes(requestOrigin)) {
			return requestOrigin;
		}
		// 첫 번째 허용 오리진 반환
		return allowedOrigins[0] ?? "*";
	}

	return allowedOrigins === requestOrigin ? requestOrigin : "";
}
