// ============================================================
// BunIgniter - E2E/통합 테스트 인프라
// Router를 직접 호출하여 HTTP 서버 없이 라우트 테스트
// ============================================================

import type { Router } from "../core/router.ts";

/**
 * 라우트 테스트 결과
 */
export interface TestResponse {
	status: number;
	headers: Headers;
	body: string;
	json: () => any;
}

/**
 * 테스트용 HTTP 요청
 * Bun.serve를 띄우지 않고 Router의 toBunServe()를 직접 호출
 *
 * 사용법:
 *   const res = await httpTest(router).get("/users");
 *   expect(res.status).toBe(200);
 *   expect(res.json()).toEqual([{ id: 1, name: "Alice" }]);
 *
 *   const res = await httpTest(router).post("/users", { name: "Bob" });
 *   const res = await httpTest(router).delete("/users/1");
 */
export function httpTest(router: Router) {
	const { routes, fetch } = router.toBunServe();

	return {
		/**
		 * GET 요청
		 */
		get(path: string, options: { headers?: Record<string, string> } = {}): Promise<TestResponse> {
			return request("GET", path, null, options.headers, routes, fetch);
		},

		/**
		 * POST 요청
		 */
		post(
			path: string,
			body?: Record<string, any> | null,
			options: { headers?: Record<string, string> } = {},
		): Promise<TestResponse> {
			return request("POST", path, body ?? null, options.headers, routes, fetch);
		},

		/**
		 * PUT 요청
		 */
		put(
			path: string,
			body?: Record<string, any> | null,
			options: { headers?: Record<string, string> } = {},
		): Promise<TestResponse> {
			return request("PUT", path, body ?? null, options.headers, routes, fetch);
		},

		/**
		 * PATCH 요청
		 */
		patch(
			path: string,
			body?: Record<string, any> | null,
			options: { headers?: Record<string, string> } = {},
		): Promise<TestResponse> {
			return request("PATCH", path, body ?? null, options.headers, routes, fetch);
		},

		/**
		 * DELETE 요청
		 */
		delete(
			path: string,
			options: { headers?: Record<string, string> } = {},
		): Promise<TestResponse> {
			return request("DELETE", path, null, options.headers, routes, fetch);
		},
	};
}

/**
 * 내부 요청 실행
 */
async function request(
	method: string,
	path: string,
	body: Record<string, any> | null,
	customHeaders: Record<string, string> = {},
	routes: Record<string, (req: any) => Response | Promise<Response>>,
	fetch: (req: Request) => Response | Promise<Response>,
): Promise<TestResponse> {
	const url = `http://localhost:3000${path}`;

	const headers: Record<string, string> = {
		...customHeaders,
	};

	let reqBody: string | null = null;
	if (body && ["POST", "PUT", "PATCH"].includes(method)) {
		headers["Content-Type"] = "application/json";
		reqBody = JSON.stringify(body);
	}

	const req = new Request(url, {
		method,
		headers,
		body: reqBody,
	});

	// Bun.serve 라우트 매칭 시뮬레이션
	// Request는 readonly이므로 Proxy로 params/method 주입
	let response: Response;

	// 경로 패턴 매칭 (단순 시뮬레이션)
	const matchedRoute = findMatchingRoute(path, routes);

	if (matchedRoute) {
		const { handler, params } = matchedRoute;
		const proxiedReq = new Proxy(req, {
			get(target, prop) {
				if (prop === "params") return params;
				const val = (target as any)[prop];
				return typeof val === "function" ? val.bind(target) : val;
			},
		});
		response = await handler(proxiedReq);
	} else {
		response = await fetch(req);
	}

	const resBody = await response.text();

	return {
		status: response.status,
		headers: response.headers,
		body: resBody,
		json: () => {
			try {
				return JSON.parse(resBody);
			} catch {
				throw new Error(`Response is not valid JSON: ${resBody.slice(0, 100)}`);
			}
		},
	};
}

/**
 * 경로 패턴 매칭
 * /users/:id → /users/123 → { id: "123" }
 */
function findMatchingRoute(
	requestPath: string,
	routes: Record<string, (req: any) => Response | Promise<Response>>,
): { handler: (req: any) => Response | Promise<Response>; params: Record<string, string> } | null {
	for (const [pattern, handler] of Object.entries(routes)) {
		const params = matchPath(pattern, requestPath);
		if (params !== null) {
			return { handler, params };
		}
	}
	return null;
}

/**
 * 경로 패턴 매칭
 * 패턴: /users/:id  →  요청: /users/123  →  { id: "123" }
 * 패턴: /posts/:slug/comments  →  요청: /posts/hello/comments  →  { slug: "hello" }
 */
function matchPath(pattern: string, requestPath: string): Record<string, string> | null {
	const patternParts = pattern.split("/").filter(Boolean);
	const pathParts = requestPath.split("/").filter(Boolean);

	if (patternParts.length !== pathParts.length) return null;

	const params: Record<string, string> = {};

	for (let i = 0; i < patternParts.length; i++) {
		const pp = patternParts[i];
		const rp = pathParts[i];

		if (pp.startsWith(":")) {
			// 동적 파라미터
			params[pp.slice(1)] = rp;
		} else if (pp !== rp) {
			return null;
		}
	}

	return params;
}

// ─── 어설션 헬퍼 ──────────────────────────────────────

/**
 * 응답 상태 코드 검증
 */
export function assertStatus(res: TestResponse, expected: number): void {
	if (res.status !== expected) {
		throw new Error(
			`Expected status ${expected}, got ${res.status}. Body: ${res.body.slice(0, 200)}`,
		);
	}
}

/**
 * JSON 응답 검증
 */
export function assertJson(res: TestResponse, expected: any): void {
	assertStatus(res, 200);
	const data = res.json();
	const equal = JSON.stringify(data) === JSON.stringify(expected);
	if (!equal) {
		throw new Error(
			`JSON mismatch.\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(data)}`,
		);
	}
}

/**
 * 리다이렉트 검증
 */
export function assertRedirect(res: TestResponse, location: string): void {
	if (![301, 302, 303, 307, 308].includes(res.status)) {
		throw new Error(`Expected redirect status, got ${res.status}`);
	}
	const loc = res.headers.get("Location");
	if (loc !== location) {
		throw new Error(`Expected redirect to "${location}", got "${loc}"`);
	}
}

/**
 * 응답에 텍스트 포함 검증
 */
export function assertBodyContains(res: TestResponse, text: string): void {
	if (!res.body.includes(text)) {
		throw new Error(`Expected body to contain "${text}". Body: ${res.body.slice(0, 200)}`);
	}
}
