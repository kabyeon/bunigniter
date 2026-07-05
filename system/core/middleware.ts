// ============================================================
// BunIgniter - Middleware 시스템
// CodeIgniter3 의 Hooks 와 유사
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
 */
export async function runMiddleware(
	request: Request,
	middlewares: MiddlewareFn[],
): Promise<Response | null> {
	let response: Response | null = null;

	for (const middleware of middlewares) {
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
			next: async () => {},
		});

		if (result instanceof Response) {
			response = result;
			break;
		}
	}

	return response;
}
