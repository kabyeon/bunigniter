// ============================================================
// BunIgniter - Route Model Binding
// 라우트 파라미터를 자동으로 모델 인스턴스로 변환
// CodeIgniter3 에는 없는 기능 (Laravel 스타일)
// ============================================================

import type { Model } from "./model.ts";

/**
 * 라우트 모델 바인딩 설정
 *
 * 라우트 파라미터(:id 등)를 자동으로 데이터베이스에서 조회하여
 * 컨트롤러에 전달합니다. 조회 실패 시 404 응답을 반환합니다.
 *
 * 사용법:
 *   // routes.ts 에서 바인딩 등록
 *   import { RouteModelBinding } from "system/core/route_model_binding.ts";
 *   import userModel from "app/models/user_model.ts";
 *
 *   RouteModelBinding.bind("user", userModel);
 *
 *   // 라우트 정의
 *   router.get("/users/:user", userController, "show");
 *
 *   // 컨트롤러에서는 params.user 에 모델 인스턴스가 전달됨
 *   async show({ params }: Context) {
 *     const user = params.user; // 이미 DB에서 조회된 객체
 *   }
 */
export class RouteModelBinding {
	private static bindings: Map<
		string,
		{
			model: Model<any>;
			field?: string; // 조회할 필드 (기본: id)
		}
	> = new Map();

	/**
	 * 라우트 파라미터 이름과 모델을 바인딩합니다.
	 *
	 * @param param 라우트 파라미터 이름 (예: "user")
	 * @param model 모델 인스턴스
	 * @param field 조회할 필드 (기본: "id")
	 *
	 * @example
	 *   RouteModelBinding.bind("user", userModel);
	 *   RouteModelBinding.bind("post", postModel, "slug");
	 */
	static bind(param: string, model: Model<any>, field?: string): void {
		RouteModelBinding.bindings.set(param, { model, field });
	}

	/**
	 * 바인딩 제거
	 */
	static unbind(param: string): void {
		RouteModelBinding.bindings.delete(param);
	}

	/**
	 * 파라미터가 바인딩되어 있는지 확인
	 */
	static has(param: string): boolean {
		return RouteModelBinding.bindings.has(param);
	}

	/**
	 * 라우트 파라미터를 자동으로 모델 인스턴스로 변환합니다.
	 * Router 내부에서 호출됩니다.
	 *
	 * @param params 라우트 파라미터 객체
	 * @returns 변환된 파라미터 객체 (기존 파라미터 + 바인딩된 모델)
	 */
	static async resolve(params: Record<string, string>): Promise<{
		params: Record<string, any>;
		notFound: string | null;
	}> {
		const resolved: Record<string, any> = { ...params };
		let notFound: string | null = null;

		for (const [paramName, binding] of RouteModelBinding.bindings.entries()) {
			const paramValue = params[paramName];
			if (paramValue === undefined) continue;

			const field = binding.field ?? "id";

			let modelInstance: any;
			if (field === "id") {
				modelInstance = await binding.model.findById(Number(paramValue));
			} else {
				const results = await binding.model.findWhere({
					[field]: paramValue,
				} as any);
				modelInstance = results[0] ?? null;
			}

			if (!modelInstance) {
				notFound = `${paramName} (${field}=${paramValue})`;
				break;
			}

			// 파라미터 값을 모델 인스턴스로 교체
			resolved[paramName] = modelInstance;
		}

		return { params: resolved, notFound };
	}

	/**
	 * 등록된 바인딩 목록 반환
	 */
	static getBindings(): string[] {
		return Array.from(RouteModelBinding.bindings.keys());
	}

	/**
	 * 모든 바인딩 초기화
	 */
	static flush(): void {
		RouteModelBinding.bindings.clear();
	}
}
