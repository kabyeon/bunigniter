// ============================================================
// BunIgniter - Security Headers 미들웨어
// OWASP 권장 보안 헤더 일괄 적용
// XSS, 클릭재킹, MIME 스니핑, 정보 유출 방지
// ============================================================

import type { MiddlewareFn } from "./middleware.ts";

/**
 * 보안 헤더 설정
 */
export interface SecurityHeadersConfig {
	/** X-Content-Type-Options (기본: "nosniff") */
	contentTypeOptions?: string | false;
	/** X-Frame-Options (기본: "SAMEORIGIN") */
	frameOptions?: string | false;
	/** X-XSS-Protection (기본: "1; mode=block") — 레거시 브라우저용 */
	xssProtection?: string | false;
	/** Referrer-Policy (기본: "strict-origin-when-cross-origin") */
	referrerPolicy?: string | false;
	/** Permissions-Policy */
	permissionsPolicy?: string | false;
	/** Strict-Transport-Security (HTTPS에서만, 기본: 비활성) */
	hsts?: string | false;
	/** Content-Security-Policy */
	csp?: string | false;
	/** Cross-Origin-Opener-Policy */
	coop?: string | false;
	/** Cross-Origin-Embedder-Policy */
	coep?: string | false;
	/** Cross-Origin-Resource-Policy */
	corp?: string | false;
}

const DEFAULT_CONFIG: SecurityHeadersConfig = {
	contentTypeOptions: "nosniff",
	frameOptions: "SAMEORIGIN",
	xssProtection: "1; mode=block",
	referrerPolicy: "strict-origin-when-cross-origin",
	permissionsPolicy: "camera=(), microphone=(), geolocation=()",
	hsts: false, // HTTPS에서만 활성화
	csp: false, // 앱마다 다르므로 기본 비활성
	coop: false,
	coep: false,
	corp: false,
};

/**
 * 보안 헤더 미들웨어 (기본 설정)
 *
 * 사용법:
 *   import { securityHeadersMiddleware } from "system/core/security_headers.ts";
 *   router.use(securityHeadersMiddleware);
 */
export const securityHeadersMiddleware: MiddlewareFn = createSecurityHeadersMiddleware();

/**
 * 커스텀 설정으로 보안 헤더 미들웨어 생성
 *
 * 사용법:
 *   import { createSecurityHeadersMiddleware } from "system/core/security_headers.ts";
 *   router.use(createSecurityHeadersMiddleware({
 *     frameOptions: "DENY",
 *     hsts: "max-age=31536000; includeSubDomains; preload",
 *     csp: "default-src 'self'; script-src 'self'",
 *   }));
 */
export function createSecurityHeadersMiddleware(config: SecurityHeadersConfig = {}): MiddlewareFn {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	return async ({ request, next }) => {
		const result = await next();

		if (!(result instanceof Response)) return result;

		const headers = new Headers(result.headers);

		// X-Content-Type-Options: MIME 스니핑 방지
		if (cfg.contentTypeOptions !== false) {
			headers.set("X-Content-Type-Options", cfg.contentTypeOptions ?? "nosniff");
		}

		// X-Frame-Options: 클릭재킹 방지
		if (cfg.frameOptions !== false) {
			headers.set("X-Frame-Options", cfg.frameOptions ?? "SAMEORIGIN");
		}

		// X-XSS-Protection: 레거시 브라우저 XSS 필터
		if (cfg.xssProtection !== false) {
			headers.set("X-XSS-Protection", cfg.xssProtection ?? "1; mode=block");
		}

		// Referrer-Policy: 리퍼러 정보 제한
		if (cfg.referrerPolicy !== false) {
			headers.set("Referrer-Policy", cfg.referrerPolicy ?? "strict-origin-when-cross-origin");
		}

		// Permissions-Policy: 브라우저 기능 제한
		if (cfg.permissionsPolicy !== false && cfg.permissionsPolicy) {
			headers.set("Permissions-Policy", cfg.permissionsPolicy);
		}

		// Strict-Transport-Security: HTTPS 강제
		if (cfg.hsts !== false && cfg.hsts) {
			headers.set("Strict-Transport-Security", cfg.hsts);
		}

		// Content-Security-Policy: 콘텐츠 소스 제한
		if (cfg.csp !== false && cfg.csp) {
			headers.set("Content-Security-Policy", cfg.csp);
		}

		// Cross-Origin-* 헤더
		if (cfg.coop !== false && cfg.coop) {
			headers.set("Cross-Origin-Opener-Policy", cfg.coop);
		}
		if (cfg.coep !== false && cfg.coep) {
			headers.set("Cross-Origin-Embedder-Policy", cfg.coep);
		}
		if (cfg.corp !== false && cfg.corp) {
			headers.set("Cross-Origin-Resource-Policy", cfg.corp);
		}

		// 서버 정보 숨기기
		headers.delete("X-Powered-By");
		headers.delete("Server");

		return new Response(result.body, {
			status: result.status,
			statusText: result.statusText,
			headers,
		});
	};
}
