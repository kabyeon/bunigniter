// ============================================================
// BunIgniter - Router
// CodeIgniter3 의 Routes 와 동일
// Elysia 라우터 래핑
// ============================================================

import type { Elysia } from "elysia";
import type { Controller, Context } from "./controller.ts";
import type { MiddlewareFn } from "./middleware.ts";

interface RouteDefinition {
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	path: string;
	handler: (ctx: Context) => Promise<Response>;
	middleware?: MiddlewareFn[];
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

	/** 등록된 라우트 목록 반환 */
	getRoutes(): RouteDefinition[] {
		return this.routes;
	}

	/**
	 * Elysia 앱에 라우트를 등록합니다.
	 */
	register(app: Elysia): Elysia {
		for (const route of this.routes) {
			const { method, path, handler } = route;

			const elysiaHandler = async (ctx: any) => {
				// URL 파라미터 추출
				const params: Record<string, string> = {};
				const url = new URL(ctx.request?.url ?? "http://localhost");

				// Elysia params
				if (ctx.params) {
					Object.assign(params, ctx.params);
				}

				// Query 파라미터
				const query: Record<string, string> = {};
				url.searchParams.forEach((v, k) => {
					query[k] = v;
				});

				// 요청 본문
				let bodyData: any = {};
				try {
					if (ctx.body) {
						bodyData = ctx.body;
					}
				} catch {
					// body 파싱 실패 시 빈 객체
				}

				// Context 객체 구성 (CodeIgniter3 스타일)
				const controllerCtx: Context = {
					request: ctx.request,
					response: {
						status: (code: number) => new Response(null, { status: code }),
						redirect: (url: string) =>
							new Response(null, { status: 302, headers: { Location: url } }),
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

				const result = await handler(controllerCtx);

				if (result instanceof Response) {
					return result;
				}

				return new Response(String(result));
			};

			// Elysia 에 라우트 등록
			switch (method) {
				case "GET":
					app.get(path, elysiaHandler);
					break;
				case "POST":
					app.post(path, elysiaHandler);
					break;
				case "PUT":
					app.put(path, elysiaHandler);
					break;
				case "DELETE":
					app.delete(path, elysiaHandler);
					break;
				case "PATCH":
					app.patch(path, elysiaHandler);
					break;
			}
		}

		return app;
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
