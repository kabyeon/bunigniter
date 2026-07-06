// ============================================================
// BunIgniter - Router
// CodeIgniter3 의 Routes 와 동일
// Bun.serve 네이티브 라우터 기반
// Auto Routing 지원 (CI3 호환)
// ============================================================

import type { AutoRouterConfig } from "./auto_router.ts";
import { AutoRouter } from "./auto_router.ts";
import type { Context, Controller, ResponseStatusBuilder } from "./controller.ts";
import { logger } from "./logger.ts";
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
 *
 * Auto Routing (CI3 호환):
 *   /posts/show/5 → PostController::show(5)
 *   /users        → UserController::index()
 *   /             → WelcomeController::index()
 *
 *   router.autoRoute({ enabled: true });  // 기본 활성화
 *   router.autoRoute({ enabled: false }); // 비활성화
 */
export class Router {
	private routes: RouteDefinition[] = [];
	private globalMiddleware: MiddlewareFn[] = [];
	private notFoundHandler: ((ctx: Context) => Promise<Response>) | null = null;
	private autoRouter: AutoRouter | null = null;

	/** GET 라우트 */
	get(path: string, controller: Controller, method: string, middleware?: MiddlewareFn[]): Router {
		this.routes.push({
			method: "GET",
			path,
			handler: (ctx) => (controller as any)[method](ctx),
			middleware,
		});
		return this;
	}

	/** POST 라우트 */
	post(path: string, controller: Controller, method: string, middleware?: MiddlewareFn[]): Router {
		this.routes.push({
			method: "POST",
			path,
			handler: (ctx) => (controller as any)[method](ctx),
			middleware,
		});
		return this;
	}

	/** PUT 라우트 */
	put(path: string, controller: Controller, method: string, middleware?: MiddlewareFn[]): Router {
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
	patch(path: string, controller: Controller, method: string, middleware?: MiddlewareFn[]): Router {
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
	resource(path: string, controller: Controller, middleware?: MiddlewareFn[]): Router {
		this.get(`/${path}`, controller, "index", middleware);
		this.get(`/${path}/create`, controller, "create", middleware);
		this.post(`/${path}`, controller, "store", middleware);
		this.get(`/${path}/:id`, controller, "show", middleware);
		this.get(`/${path}/:id/edit`, controller, "edit", middleware);
		this.put(`/${path}/:id`, controller, "update", middleware);
		this.delete(`/${path}/:id`, controller, "delete", middleware);
		return this;
	}

	/**
	 * 오토 라우트 설정
	 * CI3: $config['enable_query_strings'] = FALSE; 와 함께 자동 동작
	 *
	 * 사용법:
	 *   router.autoRoute({ enabled: true });   // 기본 활성화
	 *   router.autoRoute({                     // 커스텀 설정
	 *     enabled: true,
	 *     defaultController: "welcome",
	 *     exclude: ["api/auth"],
	 *     middleware: [csrfMiddleware],
	 *   });
	 *   router.autoRoute({ enabled: false });  // 비활성화
	 */
	autoRoute(config?: Partial<AutoRouterConfig>): Router {
		const appRoot = process.env.APP_ROOT ?? `${process.cwd()}/app`;

		if (config?.enabled === false) {
			this.autoRouter = null;
			logger.debug("AutoRoute: 비활성화됨");
			return this;
		}

		this.autoRouter = new AutoRouter(appRoot, config ?? {});
		if (this.autoRouter.isEnabled()) {
			logger.debug(
				`AutoRoute: 활성화됨 (default: ${this.autoRouter.getConfig().defaultController})`,
			);
		}
		return this;
	}

	/**
	 * 404 Not Found 핸들러 설정
	 * CI3: $route['404_override'] = 'errors/page_not_found'
	 */
	notFound(handler: (ctx: Context) => Promise<Response>): Router {
		this.notFoundHandler = handler;
		return this;
	}

	/** 글로벌 미들웨어 등록 */
	use(middleware: MiddlewareFn): Router {
		this.globalMiddleware.push(middleware);
		return this;
	}

	/** API 전용 라우트 그룹 (미들웨어 적용) */
	group(prefix: string, middleware: MiddlewareFn[], callback: (router: Router) => void): Router {
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
	 * 명시적 라우트가 오토 라우트보다 우선합니다.
	 * 오토 라우트는 fetch 핸들러에서 폴백으로 동작합니다.
	 */
	toBunServe(): {
		routes: Record<string, (req: any) => Response | Promise<Response>>;
		fetch: (req: Request) => Response | Promise<Response>;
	} {
		// Bun.serve routes 키는 경로만 사용 ("/users/:id")
		// 같은 경로에 여러 메서드가 있으면 핸들러 내부에서 req.method로 분기
		const pathGroups: Record<string, Map<string, RouteDefinition>> = {};

		for (const route of this.routes) {
			if (!pathGroups[route.path]) {
				pathGroups[route.path] = new Map();
			}
			pathGroups[route.path].set(route.method, route);
		}

		// 오토 라우터에 명시적 경로 전달
		if (this.autoRouter) {
			const explicitPaths = this.routes.map((r) => {
				// /posts/:id → /posts (파라미터 없는 prefix만)
				return r.path.replace(/\/:([^/]+)$/, "");
			});
			this.autoRouter.setExplicitPaths(explicitPaths);
		}

		const routeMap: Record<string, (req: any) => Response | Promise<Response>> = {};

		for (const [path, methodMap] of Object.entries(pathGroups)) {
			routeMap[path] = async (req: any) => {
				const httpMethod = req.method?.toUpperCase() ?? "GET";
				const route = methodMap.get(httpMethod);

				if (!route) {
					const allowed = [...methodMap.keys()].join(", ");
					return new Response(`Method Not Allowed. Allowed: ${allowed}`, {
						status: 405,
						headers: { Allow: allowed },
					});
				}

				return this.executeRoute(route, req);
			};
		}

		// fetch 핸들러 (매칭되지 않는 요청 → 오토 라우트 → 404)
		const autoRouter = this.autoRouter;
		const notFoundHandler = this.notFoundHandler;

		const fetch = async (req: Request) => {
			// ── 오토 라우트 시도 ──
			if (autoRouter) {
				let urlPath = "/";
				try {
					urlPath = new URL(req.url).pathname;
				} catch {
					// URL 파싱 실패
				}

				const contextBuilder = (
					params: Record<string, string>,
					query: Record<string, string>,
				): Context => {
					return this.buildContext(req, params, query);
				};

				const autoResult = await autoRouter.handleRequest(urlPath, req, contextBuilder);
				if (autoResult) return autoResult;
			}

			// ── 커스텀 404 핸들러 ──
			if (notFoundHandler) {
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

				const ctx = this.buildContext(req, {}, query);
				return notFoundHandler(ctx);
			}

			// ── 기본 404 응답 ──
			const accept = req.headers.get("accept") ?? "";
			if (accept.includes("application/json")) {
				return new Response(JSON.stringify({ error: "Not Found", status: 404 }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

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
	 * 라우트 실행 (미들웨어 + 파라미터 + 바인딩 + 핸들러)
	 */
	private async executeRoute(route: RouteDefinition, req: any): Promise<Response> {
		// ── 미들웨어 파이프라인 실행 ──
		const allMiddleware = [...this.globalMiddleware, ...(route.middleware ?? [])];
		const middlewareResponse = await runMiddlewarePipeline(req, allMiddleware);
		if (middlewareResponse) return middlewareResponse;

		// ── URL 파라미터 추출 ──
		const params: Record<string, string> = {};
		if (req.params) {
			Object.assign(params, req.params);
		}

		// ── 라우트 모델 바인딩 ──
		const hasBinding = Object.keys(params).some((p) => RouteModelBinding.has(p));
		if (hasBinding) {
			const { params: resolvedParams, notFound } = await RouteModelBinding.resolve(params);
			if (notFound) {
				return new Response(JSON.stringify({ error: `${notFound} not found` }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
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
			} else if (contentType.includes("application/x-www-form-urlencoded")) {
				const text = await req.text();
				bodyData = Object.fromEntries(new URLSearchParams(text).entries());
			}
		} catch {
			// body 파싱 실패 시 빈 객체
		}

		const ctx = this.buildContext(req, params, query);
		// body 데이터 주입
		(ctx as any).body = () => bodyData;

		const result = await route.handler(ctx);

		if (result instanceof Response) return result;
		return new Response(String(result));
	}

	/**
	 * Context 객체 구성
	 */
	private buildContext(
		req: Request | any,
		params: Record<string, string>,
		query: Record<string, string>,
	): Context {
		const bodyData: any = {};

		const statusBuilder = (code: number): ResponseStatusBuilder => ({
			send: (body: string) => new Response(body, { status: code }),
			json: (data: any) =>
				new Response(JSON.stringify(data), {
					status: code,
					headers: { "Content-Type": "application/json" },
				}),
		});

		return {
			request: req as any,
			response: {
				status: statusBuilder,
				redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
				json: (data: any) =>
					new Response(JSON.stringify(data), {
						headers: { "Content-Type": "application/json" },
					}),
				send: (body: string | Response) => (body instanceof Response ? body : new Response(body)),
				headers: (headers: Record<string, string>) => ({ headers }),
				cookie: () => {},
			},
			params,
			query,
			body: () => bodyData,
		};
	}

	/**
	 * 라우트 목록 출력
	 */
	printRoutes(): void {
		console.log("\n📋 등록된 라우트:\n");
		console.log(`  ${"Method".padEnd(8)}${"Path".padEnd(30)}Handler`);
		console.log(`  ${"─".repeat(8)}${"─".repeat(30)}${"─".repeat(20)}`);
		for (const route of this.routes) {
			const methodStr = route.method.padEnd(8);
			const pathStr = route.path.padEnd(30);
			console.log(`  ${methodStr}${pathStr}`);
		}
		if (this.autoRouter?.isEnabled()) {
			console.log(`  ${"AUTO".padEnd(8)}${"/*".padEnd(30)}AutoRouter (CI3 호환)`);
		}
		console.log("");
	}
}
