// ============================================================
// BunIgniter - Middleware 시스템
// CodeIgniter3 의 Hooks 와 유사
// 파이프라인 패턴으로 라우트별 + 글로벌 미들웨어 실행
// ============================================================

export interface MiddlewareContext {
	request: Request;
	response: {
		status: (code: number) => any;
		redirect: (url: string) => Response;
		json: (data: any) => Response;
		send: (body: string) => Response;
		headers: (headers: Record<string, string>) => any;
	};
	next: () => Promise<Response | void>;
}

export type MiddlewareFn = (ctx: MiddlewareContext) => Promise<Response | void>;

/**
 * 미들웨어 파이프라인 실행
 * 글로벌 미들웨어 → 라우트 미들웨어 순서로 체인 실행
 * 각 미들웨어는 next() 를 호출하여 다음 미들웨어로 제어를 넘깁니다.
 * next() 를 호출하지 않으면 파이프라인이 중단됩니다.
 *
 * 사용법:
 *   const result = await runMiddlewarePipeline(request, [authMiddleware, csrfMiddleware]);
 *   if (result) return result; // 미들웨어가 응답을 반환한 경우 (차단)
 *   // 통과한 경우 핸들러 실행
 */
export async function runMiddlewarePipeline(
	request: Request,
	middlewares: MiddlewareFn[],
): Promise<Response | null> {
	if (middlewares.length === 0) return null;

	let index = 0;
	let finalResponse: Response | null = null;

	const createNext = (
		currentIndex: number,
	): (() => Promise<Response | void>) => {
		return async () => {
			index = currentIndex + 1;
			if (index < middlewares.length) {
				await executeMiddleware(index);
			}
		};
	};

	const executeMiddleware = async (i: number): Promise<void> => {
		const middleware = middlewares[i];
		const result = await middleware({
			request,
			response: {
				status: (code: number) => ({ status: code }),
				redirect: (url: string) =>
					new Response(null, { status: 302, headers: { Location: url } }),
				json: (data: any) =>
					new Response(JSON.stringify(data), {
						headers: { "Content-Type": "application/json" },
					}),
				send: (body: string) => new Response(body),
				headers: (h: Record<string, string>) => ({ headers: h }),
			},
			next: createNext(i),
		});

		if (result instanceof Response) {
			finalResponse = result;
		}
	};

	await executeMiddleware(0);
	return finalResponse;
}

/**
 * 구버전 호환용 (deprecated - runMiddlewarePipeline 사용 권장)
 */
export async function runMiddleware(
	request: Request,
	middlewares: MiddlewareFn[],
): Promise<Response | null> {
	return runMiddlewarePipeline(request, middlewares);
}
