// ============================================================
// BunIgniter - Router
// CodeIgniter3 의 Routes 와 동일
// Bun.serve 네이티브 라우터 기반
// ============================================================

import type { Controller, Context } from "./controller.ts";
import type { MiddlewareFn } from "./middleware.ts";
import { runMiddlewarePipeline } from "./middleware.ts";
import { RouteModelBinding } from "./route_model_binding.ts";

interface RouteDefinition {
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	path: string;
	handler: (ctx: Context) => Promise<Response>;
	middleware?: MiddlewareFn[];
}

/** Bun.serve 라우트 항목 타입 */
export interface BunServeRoute {
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	pattern: string;
	handler: (req: Request) => Response | Promise<Response>;
}

/** Bun.serve 설정 타입 */
export interface BunServeOptions {
	port?: number;
	hostname?: string;
	websocket?: any;
}

/**
 * BunIgniter 라우터
 *
 * CodeIgniter3:
 *   $route['get /users'] = 'users/index';
 *   $route['post /users'] = 'users/store';
 *
 * BunIgniter:
 *   router.get("/users", usersController, "index");
 *   router.post("/users", usersController, "store");
 *   router.resource("/users", usersController);
 */
export class Router {
	private routes: RouteDefinition[] = [];
	private globalMiddleware: MiddlewareFn[] = [];

	/** GET 라우트 */
	get(
		path: string,
		controller: Controller,
		method: string,
		middleware?: MiddlewareFn[],
	): Router {
		this.routes.push({
			method: "GET",
			path,
			handler: (ctx) => (controller as any)[method](ctx),
			middleware,
		});
		return this;
	}

	/** POST 라우트 */
	post(
		path: string,
		controller: Controller,
		method: string,
		middleware?: MiddlewareFn[],
	): Router {
		this.routes.push({
			method: "POST",
			path,
			handler: (ctx) => (controller as any)[method](ctx),
			middleware,
		});
		return this;
	}

	/** PUT 라우트 */
	put(
		path: string,
		controller: Controller,
		method: string,
		middleware?: MiddlewareFn[],
	): Router {
		this.routes.push({
			method: "PUT",
			path,
			handler: (ctx) => (controller as any)[method](ctx),
			middleware,
		});
		return this;
	}

	/** DELETE 라우트 */
	delete(
		path: string,
		controller: Controller,
		method: string,
		middleware?: MiddlewareFn[],
	): Router {
		this.routes.push({
			method: "DELETE",
			path,
			handler: (ctx) => (controller as any)[method](ctx),
			middleware,
		});
		return this;
	}

	/** PATCH 라우트 */
	patch(
		path: string,
		controller: Controller,
		method: string,
		middleware?: MiddlewareFn[],
	): Router {
		this.routes.push({
			method: "PATCH",
			path,
			handler: (ctx) => (controller as any)[method](ctx),
			middleware,
		});
		return this;
	}

	/**
	 * RESTful 리소스 라우트 (한 번에 CRUD 라우팅)
	 * CodeIgniter3: $route['resource'] = 'resource';
	 *
	 * 생성되는 라우트:
	 *   GET    /resource           -> index
	 *   GET    /resource/create    -> create
	 *   POST   /resource           -> store
	 *   GET    /resource/:id       -> show
	 *   GET    /resource/:id/edit  -> edit
	 *   PUT    /resource/:id       -> update
	 *   DELETE /resource/:id       -> delete
	 */
	resource(
		path: string,
		controller: Controller,
		middleware?: MiddlewareFn[],
	): Router {
		this.get(`/${path}`, controller, "index", middleware);
		this.get(`/${path}/create`, controller, "create", middleware);
		this.post(`/${path}`, controller, "store", middleware);
		this.get(`/${path}/:id`, controller, "show", middleware);
		this.get(`/${path}/:id/edit`, controller, "edit", middleware);
		this.put(`/${path}/:id`, controller, "update", middleware);
		this.delete(`/${path}/:id`, controller, "delete", middleware);
		return this;
	}

	/** 글로벌 미들웨어 등록 */
	use(middleware: MiddlewareFn): Router {
		this.globalMiddleware.push(middleware);
		return this;
	}

	/** API 전용 라우트 그룹 (미들웨어 적용) */
	group(
		prefix: string,
		middleware: MiddlewareFn[],
		callback: (router: Router) => void,
	): Router {
		const subRouter = new Router();
		callback(subRouter);

		for (const route of subRouter.getRoutes()) {
			this.routes.push({
				...route,
				path: `${prefix}${route.path}`,
				middleware: [...middleware, ...(route.middleware ?? [])],
			});
		}

		return this;
	}

	/** 등록된 라우트 목록 반환 */
	getRoutes(): RouteDefinition[] {
		return this.routes;
	}

	/**
	 * Bun.serve 라우트 객체 생성
	 * Router에 등록된 모든 라우트를 Bun.serve routes 형식으로 변환합니다.
	 *
	 * @example
	 * ```typescript
	 * const router = new Router();
	 * router.get("/users", controller, "index");
	 *
	 * const { routes, fetch } = router.toBunServe();
	 * Bun.serve({ routes, fetch });
	 * ```
	 */
	toBunServe(): {
		routes: Record<string, (req: any) => Response | Promise<Response>>;
		fetch: (req: Request) => Response | Promise<Response>;
	} {
		const routeMap: Record<string, (req: any) => Response | Promise<Response>> = {};

		for (const route of this.routes) {
			const key = `${route.method} ${route.path}`;

			routeMap[key] = async (req: any) => {
				// ── 미들웨어 파이프라인 실행 ──
				const allMiddleware = [
					...this.globalMiddleware,
					...(route.middleware ?? []),
				];

				const middlewareResponse = await runMiddlewarePipeline(
					req,
					allMiddleware,
				);
				if (middlewareResponse) return middlewareResponse;

				// ── URL 파라미터 추출 ──
				const params: Record<string, string> = {};

				// Bun.serve BunRequest.params
				if (req.params) {
					Object.assign(params, req.params);
				}

				// ── 라우트 모델 바인딩 ──
				const hasBinding = Object.keys(params).some((p) =>
					RouteModelBinding.has(p),
				);
				if (hasBinding) {
					const { params: resolvedParams, notFound } =
						await RouteModelBinding.resolve(params);
					if (notFound) {
						return new Response(
							JSON.stringify({ error: `${notFound} not found` }),
							{
								status: 404,
								headers: { "Content-Type": "application/json" },
							},
						);
					}
					Object.assign(params, resolvedParams);
				}

				// Query 파라미터
				const query: Record<string, string> = {};
				let url: URL;
				try {
					url = new URL(req.url);
				} catch {
					url = new URL("http://localhost");
				}
				url.searchParams.forEach((v, k) => {
					query[k] = v;
				});

				// 요청 본문 파싱
				let bodyData: any = {};
				try {
					const contentType = req.headers.get("content-type") ?? "";
					if (contentType.includes("application/json")) {
						bodyData = await req.json();
					} else if (contentType.includes("multipart/form-data")) {
						const formData = await req.formData();
						bodyData = Object.fromEntries(formData.entries());
					} else if (
						contentType.includes("application/x-www-form-urlencoded")
					) {
						const text = await req.text();
						bodyData = Object.fromEntries(
							new URLSearchParams(text).entries(),
						);
					}
				} catch {
					// body 파싱 실패 시 빈 객체
				}

				// Context 객체 구성 (CodeIgniter3 스타일)
				const controllerCtx: Context = {
					request: req,
					response: {
						status: (code: number) => new Response(null, { status: code }),
						redirect: (url: string) =>
							new Response(null, {
								status: 302,
								headers: { Location: url },
							}),
						json: (data: any) =>
							new Response(JSON.stringify(data), {
								headers: { "Content-Type": "application/json" },
							}),
						send: (body: string | Response) =>
							body instanceof Response ? body : new Response(body),
						headers: (headers: Record<string, string>) => ({ headers }),
						cookie: () => {},
					},
					params,
					query,
					body: () => bodyData,
				};

				const result = await route.handler(controllerCtx);

				if (result instanceof Response) {
					return result;
				}

				return new Response(String(result));
			};
		}

		// Fatch 핸들러 (매칭되지 않는 요청)
		const fetch = (_req: Request) => {
			return new Response(
				`<!DOCTYPE html><html><head><meta charset="utf-8"><title>404 - 페이지를 찾을 수 없습니다</title></head><body style="font-family:sans-serif;text-align:center;padding:50px"><h1>404</h1><p>요청하신 페이지를 찾을 수 없습니다.</p><a href="/">홈으로 돌아가기</a></body></html>`,
				{
					status: 404,
					headers: { "Content-Type": "text/html; charset=utf-8" },
				},
			);
		};

		return { routes: routeMap, fetch };
	}

	/**
	 * 라우트 목록 출력
	 */
	printRoutes(): void {
		console.log("\n📋 등록된 라우트:\n");
		console.log("  " + "Method".padEnd(8) + "Path".padEnd(30) + "Handler");
		console.log("  " + "─".repeat(8) + "─".repeat(30) + "─".repeat(20));
		for (const route of this.routes) {
			const methodStr = route.method.padEnd(8);
			const pathStr = route.path.padEnd(30);
			console.log(`  ${methodStr}${pathStr}`);
		}
		console.log("");
	}
}
