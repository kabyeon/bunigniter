// ============================================================
// BunIgniter - Auto Router
// CodeIgniter3 의 Auto Routing 과 동일
// URL → Controller/Method 자동 매핑
// 명시적 라우트가 있으면 오토 라우트 무시
// ============================================================

import { join, sep } from "node:path";
import type { Context } from "./controller.ts";
import { logger } from "./logger.ts";
import type { MiddlewareFn } from "./middleware.ts";

/**
 * Auto Router 설정
 *
 * CI3: application/config/routes.php
 *   $route['default_controller'] = 'welcome';
 *   $config['enable_query_strings'] = FALSE;
 */
export interface AutoRouterConfig {
	/** 오토 라우트 활성화 (기본: true) */
	enabled: boolean;
	/** 기본 컨트롤러 (CI3: default_controller) */
	defaultController: string;
	/** 기본 메서드 (CI3: index) */
	defaultMethod: string;
	/** 404 시 사용할 컨트롤러/메서드 (CI3: 404_override) */
	notFoundOverride?: string;
	/** 오토 라우트에 적용할 미들웨어 */
	middleware?: MiddlewareFn[];
	/** 컨트롤러 디렉토리 (app/controllers 기준 하위) */
	controllerDirs?: string[];
	/** 제외할 컨트롤러 (예: ["api/auth"]) */
	exclude?: string[];
}

const DEFAULT_CONFIG: AutoRouterConfig = {
	enabled: true,
	defaultController: "welcome",
	defaultMethod: "index",
};

/**
 * 오토 라우트 해석 결과
 */
export interface AutoRouteMatch {
	/** 컨트롤러 파일 경로 (app/controllers 기준) */
	controllerPath: string;
	/** 컨트롤러 클래스명 */
	className: string;
	/** 메서드명 */
	methodName: string;
	/** URL 파라미터 (메서드 인자) */
	params: string[];
	/** 미들웨어 */
	middleware: MiddlewareFn[];
}

/**
 * 오토 라우터
 *
 * CI3 동작 방식:
 *   /                    → Welcome::index()
 *   /posts               → Posts::index()
 *   /posts/show/5        → Posts::show(5)
 *   /admin/users         → Admin/Users::index() (서브디렉토리)
 *   /admin/users/edit/3  → Admin/Users::edit(3)
 *
 * BunIgniter 동작 방식:
 *   /                    → WelcomeController::index()
 *   /posts               → PostController::index()
 *   /posts/show/5        → PostController::show(5)
 *   /admin/users         → admin/user_controller.ts → UserController::index()
 *   /admin/users/edit/3  → admin/user_controller.ts → UserController::edit(3)
 *
 * 명시적 라우트가 오토 라우트보다 우선:
 *   router.get("/posts", ...) 가 있으면 /posts 는 오토 라우트 사용 안함
 */
export class AutoRouter {
	private config: AutoRouterConfig;
	private appRoot: string;
	/** 컨트롤러 캐시 (경로 → 모듈) */
	private controllerCache: Map<string, any> = new Map();
	/** 명시적 라우트 경로 집합 (우선 판별용) */
	private explicitPaths: Set<string> = new Set();
	/** 디버그 모드 (캐시 무시) */
	private debug: boolean = false;

	constructor(appRoot: string, config: Partial<AutoRouterConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.appRoot = appRoot;
		this.debug = process.env.NODE_ENV === "development";
	}

	/**
	 * 명시적 라우트 경로 등록
	 * Router.toBunServe() 에서 호출
	 */
	setExplicitPaths(paths: string[]): void {
		this.explicitPaths = new Set(paths);
	}

	/**
	 * URL 경로에서 오토 라우트 해석
	 *
	 * @param urlPath URL 경로 (예: "/posts/show/5")
	 * @returns 매칭 결과 또는 null
	 */
	async resolve(urlPath: string): Promise<AutoRouteMatch | null> {
		if (!this.config.enabled) return null;

		// 경로 정규화
		const path = urlPath.replace(/\/+$/, "").replace(/^\/+/, "");
		const segments = path ? path.split("/") : [];

		// 루트 경로 → 기본 컨트롤러
		if (segments.length === 0 || (segments.length === 1 && segments[0] === "")) {
			return this.resolveDefault();
		}

		// 제외 목록 확인
		if (this.config.exclude) {
			const fullPath = segments.join("/");
			if (this.config.exclude.some((ex) => fullPath.startsWith(ex))) {
				return null;
			}
		}

		// 서브디렉토리 탐색 (최대 2레벨: admin/users/edit/3)
		// CI3: application/controllers/admin/Users.php
		return this.resolveFromSegments(segments);
	}

	/**
	 * 기본 컨트롤러 해석
	 */
	private async resolveDefault(): Promise<AutoRouteMatch | null> {
		const controllerName = this.config.defaultController;
		return this.tryLoadController([], controllerName, this.config.defaultMethod, []);
	}

	/**
	 * URL 세그먼트에서 컨트롤러/메서드 해석
	 *
	 * 시도 순서:
	 *   [admin, users, edit, 3]
	 *   1. admin/users + edit(3)     → admin/user_controller.ts :: edit(3)
	 *   2. admin + users(edit, 3)    → admin_controller.ts :: users(edit, 3) ← 비자연스러움
	 *
	 *   [posts, show, 5]
	 *   1. posts + show(5)           → post_controller.ts :: show(5)
	 */
	private async resolveFromSegments(segments: string[]): Promise<AutoRouteMatch | null> {
		// 서브디렉토리 탐색 (최대 2레벨까지)
		const maxDirDepth = Math.min(segments.length - 1, 2);

		for (let dirDepth = maxDirDepth; dirDepth >= 0; dirDepth--) {
			const dirSegments = segments.slice(0, dirDepth);
			const remaining = segments.slice(dirDepth);

			if (remaining.length === 0) continue;

			const controllerName = remaining[0];
			const methodAndParams = remaining.slice(1);
			const methodName =
				methodAndParams.length > 0 ? methodAndParams[0] : this.config.defaultMethod;
			const params = methodAndParams.length > 1 ? methodAndParams.slice(1) : [];

			const result = await this.tryLoadController(dirSegments, controllerName, methodName, params);
			if (result) return result;
		}

		return null;
	}

	/**
	 * 컨트롤러 로드 시도
	 *
	 * 파일명 규칙 (snake_case):
	 *   posts       → post_controller.ts
	 *   users       → user_controller.ts
	 *   post-categories → post_category_controller.ts
	 *
	 * 클래스명 규칙 (PascalCase):
	 *   post_controller.ts → PostController
	 *   user_controller.ts → UserController
	 */
	private async tryLoadController(
		dirSegments: string[],
		controllerName: string,
		methodName: string,
		params: string[],
	): Promise<AutoRouteMatch | null> {
		// 컨트롤러 파일명 생성
		const fileBase = this.controllerNameToFileBase(controllerName);
		const fileName = `${fileBase}_controller.ts`;
		const dirPath = dirSegments.length > 0 ? dirSegments.join(sep) : "";

		// 전체 경로 (명시적 라우트 중복 확인용)
		const urlPath = [...dirSegments, controllerName].join("/");
		if (this.explicitPaths.has(`/${urlPath}`)) {
			return null;
		}

		// 컨트롤러 모듈 로드
		const controllerModule = await this.loadControllerModule(dirPath, fileName);
		if (!controllerModule) return null;

		// 클래스 찾기: default export 인스턴스 → 프로토타입에서 메서드 확인
		const instance = controllerModule.default;
		if (!instance) return null;

		// 메서드 존재 확인
		const method = instance[methodName];
		if (typeof method !== "function") return null;

		// 내부 메서드 제외 (_ 로 시작하는 메서드는 public API가 아님)
		if (methodName.startsWith("_")) return null;

		// 생성자 등 제외
		if (methodName === "constructor") return null;

		// 클래스명 추론
		const className = this.fileBaseToClassName(fileBase);

		logger.debug(`AutoRoute: /${urlPath}/${methodName} → ${className}::${methodName}()`);

		return {
			controllerPath: dirPath ? `${dirPath}/${fileName}` : fileName,
			className,
			methodName,
			params,
			middleware: this.config.middleware ?? [],
		};
	}

	/**
	 * 컨트롤러 모듈 로드 (캐시 사용)
	 */
	private async loadControllerModule(dirPath: string, fileName: string): Promise<any | null> {
		const cacheKey = dirPath ? `${dirPath}/${fileName}` : fileName;

		// 개발 모드에서는 캐시 무시 (핫리로드)
		if (!this.debug && this.controllerCache.has(cacheKey)) {
			return this.controllerCache.get(cacheKey);
		}

		const fullPath = join(this.appRoot, "controllers", dirPath, fileName);

		try {
			const mod = await import(fullPath);
			this.controllerCache.set(cacheKey, mod);
			return mod;
		} catch {
			// 컨트롤러 파일 없음
			return null;
		}
	}

	/**
	 * 컨트롤러 이름 → 파일 베이스명
	 *
	 * CI3: posts → Post (단수형 + PascalCase)
	 * BunIgniter: posts → post (단수형 + snake_case)
	 *
	 * 규칙:
	 *   posts           → post
	 *   post-categories → post_category  (kebab → snake + 단수화)
	 *   users           → user
	 *   admin           → admin
	 */
	private controllerNameToFileBase(name: string): string {
		// kebab-case → snake_case
		let result = name.replace(/-/g, "_");

		// 복수형 → 단수형 (간단한 규칙)
		result = this.singularize(result);

		return result;
	}

	/**
	 * 파일 베이스명 → 클래스명
	 *
	 * post       → Post
	 * user       → User
	 * post_category → PostCategory
	 */
	private fileBaseToClassName(fileBase: string): string {
		return fileBase
			.split("_")
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join("");
	}

	/**
	 * 간단한 단수화
	 * ies → y, ses → s, s → (제거)
	 */
	private singularize(word: string): string {
		// 이미 단수형일 가능성이 높은 짧은 단어
		if (word.length <= 2) return word;

		// 불규칙 복수형
		const irregulars: Record<string, string> = {
			people: "person",
			men: "man",
			women: "woman",
			children: "child",
			mice: "mouse",
			geese: "goose",
			feet: "foot",
			teeth: "tooth",
		};

		const lower = word.toLowerCase();
		if (irregulars[lower]) {
			// 원래 대소문자 유지
			const singular = irregulars[lower];
			if (word[0] === word[0].toUpperCase()) {
				return singular.charAt(0).toUpperCase() + singular.slice(1);
			}
			return singular;
		}

		// 규칙형 복수형
		if (word.endsWith("ies") && word.length > 3) {
			return `${word.slice(0, -3)}y`;
		}
		if (word.endsWith("ses") && word.length > 3) {
			return word.slice(0, -2);
		}
		if (word.endsWith("shes") && word.length > 4) {
			return word.slice(0, -2);
		}
		if (word.endsWith("ches") && word.length > 4) {
			return word.slice(0, -2);
		}
		if (word.endsWith("xes") && word.length > 3) {
			return word.slice(0, -2);
		}
		if (word.endsWith("s") && !word.endsWith("ss") && word.length > 1) {
			return word.slice(0, -1);
		}

		return word;
	}

	/**
	 * 오토 라우트 핸들러를 Bun.serve fetch 에 통합
	 *
	 * Router.toBunServe()의 fetch 핸들러에서 호출
	 */
	async handleRequest(
		urlPath: string,
		req: Request,
		contextBuilder: (params: Record<string, string>, query: Record<string, string>) => Context,
	): Promise<Response | null> {
		const match = await this.resolve(urlPath);
		if (!match) return null;

		// 컨트롤러 모듈 로드
		const dirPath = match.controllerPath.includes("/")
			? match.controllerPath.substring(0, match.controllerPath.lastIndexOf("/"))
			: "";
		const fileName = match.controllerPath.includes("/")
			? match.controllerPath.substring(match.controllerPath.lastIndexOf("/") + 1)
			: match.controllerPath;

		const mod = await this.loadControllerModule(dirPath, fileName);
		if (!mod?.default) return null;

		const instance = mod.default;
		const method = instance[match.methodName];
		if (typeof method !== "function") return null;

		// params 구성 (positional → named: arg0, arg1, ...)
		const params: Record<string, string> = {};
		for (let i = 0; i < match.params.length; i++) {
			params[`arg${i}`] = match.params[i];
		}

		// 쿼리 파라미터
		const query: Record<string, string> = {};
		try {
			const url = new URL(req.url);
			url.searchParams.forEach((v, k) => {
				query[k] = v;
			});
		} catch {
			// URL 파싱 실패
		}

		const ctx = contextBuilder(params, query);

		// 메서드 호출 (CI3처럼 인자 전달)
		const result =
			match.params.length > 0
				? await method.call(instance, ctx, ...match.params)
				: await method.call(instance, ctx);

		if (result instanceof Response) return result;
		return new Response(String(result));
	}

	/**
	 * 캐시 초기화
	 */
	clearCache(): void {
		this.controllerCache.clear();
	}

	/**
	 * 설정 반환
	 */
	getConfig(): AutoRouterConfig {
		return { ...this.config };
	}

	/**
	 * 오토 라우트 활성화 여부
	 */
	isEnabled(): boolean {
		return this.config.enabled;
	}
}
