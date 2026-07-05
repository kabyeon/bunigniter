// ============================================================
// BunIgniter - Rate Limiting Middleware
// 요청 빈도 제한 미들웨어
// 인메모리 슬라이딩 윈도우 방식
// ============================================================

export interface RateLimitConfig {
	/** 시간 윈도우 (초, 기본값: 60) */
	windowMs: number;
	/** 윈도우 내 최대 요청 수 (기본값: 100) */
	maxRequests: number;
	/** 클라이언트 식별 키 함수 (기본값: IP 주소) */
	keyGenerator?: (request: Request) => string;
	/** 제한 초과 시 메시지 */
	message: string;
	/** 제한 초과 시 HTTP 상태 코드 */
	statusCode: number;
	/** 응답 헤더 포함 여부 */
	headers: boolean;
}

const DEFAULT_CONFIG: RateLimitConfig = {
	windowMs: 60,
	maxRequests: 100,
	message: "Too many requests, please try again later.",
	statusCode: 429,
	headers: true,
};

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

/** 인메모리 요청 기록 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/** 주기적 정리 타이머 */
let gcTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Rate Limiting 미들웨어
 *
 * 사용법:
 *   import { rateLimitMiddleware } from "system/core/rate_limit.ts";
 *   router.use(rateLimitMiddleware);
 *
 * 커스텀 설정:
 *   import { createRateLimitMiddleware } from "system/core/rate_limit.ts";
 *   router.use(createRateLimitMiddleware({
 *     windowMs: 60,
 *     maxRequests: 30,
 *   }));
 *
 * API별 다른 제한:
 *   import { createRateLimitMiddleware } from "system/core/rate_limit.ts";
 *   router.group("/api", [
 *     createRateLimitMiddleware({ windowMs: 60, maxRequests: 60 }),
 *   ], (apiRouter) => {
 *     // ...
 *   });
 */
export async function rateLimitMiddleware({
	request,
	next,
}: {
	request: Request;
	response: any;
	next: () => Promise<Response | void>;
}): Promise<Response | void> {
	return handleRateLimit(request, next, DEFAULT_CONFIG);
}

/**
 * 커스텀 설정으로 Rate Limit 미들웨어 생성
 */
export function createRateLimitMiddleware(
	config: Partial<RateLimitConfig>,
): (ctx: { request: Request; response: any; next: () => Promise<Response | void> }) => Promise<Response | void> {
	const merged = { ...DEFAULT_CONFIG, ...config };
	return async ({ request, next }) => handleRateLimit(request, next, merged);
}

/**
 * Rate Limit 처리 로직
 */
async function handleRateLimit(
	request: Request,
	next: () => Promise<Response | void>,
	config: RateLimitConfig,
): Promise<Response | void> {
	// 클라이언트 식별 키
	const key = config.keyGenerator
		? config.keyGenerator(request)
		: getClientIp(request);

	const now = Date.now();
	const windowMs = config.windowMs * 1000;

	// 기존 기록 조회
	let entry = rateLimitStore.get(key);

	// 윈도우 만료 시 초기화
	if (!entry || now > entry.resetTime) {
		entry = {
			count: 0,
			resetTime: now + windowMs,
		};
		rateLimitStore.set(key, entry);
	}

	// 요청 카운트 증가
	entry.count++;

	const remaining = Math.max(0, config.maxRequests - entry.count);
	const resetTimeSeconds = Math.ceil((entry.resetTime - now) / 1000);

	// 제한 초과
	if (entry.count > config.maxRequests) {
		const responseHeaders: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (config.headers) {
			responseHeaders["X-RateLimit-Limit"] = String(config.maxRequests);
			responseHeaders["X-RateLimit-Remaining"] = "0";
			responseHeaders["X-RateLimit-Reset"] = String(resetTimeSeconds);
			responseHeaders["Retry-After"] = String(resetTimeSeconds);
		}

		return new Response(
			JSON.stringify({
				error: config.message,
				retryAfter: resetTimeSeconds,
			}),
			{
				status: config.statusCode,
				headers: responseHeaders,
			},
		);
	}

	// 다음 핸들러 실행
	const result = await next();

	// 응답에 Rate Limit 헤더 추가
	if (result instanceof Response && config.headers) {
		const headers = new Headers(result.headers);
		headers.set("X-RateLimit-Limit", String(config.maxRequests));
		headers.set("X-RateLimit-Remaining", String(remaining));
		headers.set("X-RateLimit-Reset", String(resetTimeSeconds));

		return new Response(result.body, {
			status: result.status,
			statusText: result.statusText,
			headers,
		});
	}

	return result;
}

/**
 * 클라이언트 IP 주소 추출
 */
function getClientIp(request: Request): string {
	// 프록시 헤더 확인
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) {
		return forwarded.split(",")[0].trim();
	}

	const realIp = request.headers.get("x-real-ip");
	if (realIp) return realIp;

	// 직접 연결
	return "unknown";
}

/**
 * 만료된 항목 정리 (GC)
 */
export function cleanupRateLimitStore(): number {
	const now = Date.now();
	let removed = 0;

	for (const [key, entry] of rateLimitStore.entries()) {
		if (now > entry.resetTime) {
			rateLimitStore.delete(key);
			removed++;
		}
	}

	return removed;
}

/**
 * Rate Limit 스토어 초기화
 */
export function resetRateLimitStore(): void {
	rateLimitStore.clear();
}

/**
 * 특정 키의 Rate Limit 초기화
 */
export function resetRateLimitForKey(key: string): boolean {
	return rateLimitStore.delete(key);
}

/**
 * 현재 Rate Limit 상태 조회
 */
export function getRateLimitStatus(
	key: string,
): { count: number; resetTime: number } | null {
	const entry = rateLimitStore.get(key);
	if (!entry) return null;
	return { count: entry.count, resetTime: entry.resetTime };
}

// 자동 GC (5분마다)
if (!gcTimer) {
	gcTimer = setInterval(
		() => {
			cleanupRateLimitStore();
		},
		5 * 60 * 1000,
	);
}
