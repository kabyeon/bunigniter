// ============================================================
// BunIgniter - OpenAPI / Swagger 자동 문서 생성
// 라우트 정의에서 OpenAPI 3.0 스펙을 자동 생성합니다.
// ============================================================

import type { Router } from "./router.ts";

export interface OpenApiInfo {
	title: string;
	description?: string;
	version: string;
}

export interface OpenApiServer {
	url: string;
	description?: string;
}

export interface OpenApiConfig {
	info: OpenApiInfo;
	servers?: OpenApiServer[];
	/** 기본 보안 스키마 */
	securitySchemes?: Record<string, any>;
}

interface OpenApiPath {
	summary?: string;
	description?: string;
	tags?: string[];
	parameters?: any[];
	requestBody?: any;
	responses?: Record<string, any>;
	security?: any[];
}

/**
 * OpenAPI 3.0 스펙 생성기
 *
 * 사용법:
 *   import { OpenApiGenerator } from "system/core/openapi.ts";
 *   import router from "app/config/routes.ts";
 *
 *   const generator = new OpenApiGenerator({
 *     info: { title: "My API", version: "1.0.0" },
 *     servers: [{ url: "http://localhost:3000" }],
 *   });
 *
 *   // OpenAPI 스펙 생성
 *   const spec = generator.generate(router);
 *
 *   // JSON 문자열로 출력
 *   console.log(generator.toJson());
 *
 *   // Swagger UI HTML 생성
 *   const html = generator.swaggerUiHtml("/api/docs");
 */

export class OpenApiGenerator {
	private config: OpenApiConfig;
	private pathOverrides: Map<string, Map<string, OpenApiPath>> = new Map();

	constructor(config: OpenApiConfig) {
		this.config = config;
	}

	/**
	 * 특정 라우트의 OpenAPI 문서 커스터마이징
	 *
	 * @example
	 *   generator.describe("GET", "/users", {
	 *     summary: "사용자 목록 조회",
	 *     tags: ["Users"],
	 *     responses: {
	 *       "200": { description: "사용자 목록" },
	 *     },
	 *   });
	 */
	describe(
		method: string,
		path: string,
		description: OpenApiPath,
	): OpenApiGenerator {
		const upperMethod = method.toUpperCase();
		if (!this.pathOverrides.has(path)) {
			this.pathOverrides.set(path, new Map());
		}
		this.pathOverrides.get(path)!.set(upperMethod, description);
		return this;
	}

	/**
	 * Router에서 OpenAPI 스펙 생성
	 */
	generate(router: Router): Record<string, any> {
		const routes = router.getRoutes();

		const paths: Record<string, Record<string, any>> = {};
		const tags: Set<string> = new Set();

		for (const route of routes) {
			const method = route.method.toLowerCase();
			const openApiPath = this.convertPathToOpenApi(route.path);

			// 태그 추출 (경로 첫 세그먼트)
			const segments = route.path.split("/").filter(Boolean);
			const tag = segments[0] ? this.capitalize(segments[0]) : "Default";
			tags.add(tag);

			// 오버라이드 확인
			const override = this.pathOverrides
				.get(route.path)
				?.get(route.method);

			// 파라미터 추출
			const parameters = this.extractParameters(openApiPath, route.method);

			// 라우트 문서 구성
			const pathDoc: Record<string, any> = {
				summary: override?.summary ?? `${method.toUpperCase()} ${route.path}`,
				description: override?.description ?? "",
				tags: override?.tags ?? [tag],
				parameters,
				responses: override?.responses ?? this.defaultResponses(route.method),
			};

			// POST/PUT/PATCH 시 requestBody 추가
			if (["post", "put", "patch"].includes(method)) {
				pathDoc.requestBody = override?.requestBody ?? {
					content: {
						"application/json": {
							schema: { type: "object" },
						},
					},
				};
			}

			if (override?.security) {
				pathDoc.security = override.security;
			}

			// paths에 추가
			if (!paths[openApiPath]) {
				paths[openApiPath] = {};
			}
			paths[openApiPath][method] = pathDoc;
		}

		// OpenAPI 스펙 조합
		const spec: Record<string, any> = {
			openapi: "3.0.0",
			info: this.config.info,
			servers: this.config.servers ?? [],
			paths,
			tags: Array.from(tags).map((name) => ({ name })),
		};

		// 보안 스키마
		if (this.config.securitySchemes) {
			spec.components = {
				securitySchemes: this.config.securitySchemes,
			};
		}

		return spec;
	}

	/**
	 * JSON 문자열로 변환
	 */
	toJson(router: Router, indent: number = 2): string {
		return JSON.stringify(this.generate(router), null, indent);
	}

	/**
	 * Swagger UI HTML 생성
	 */
	swaggerUiHtml(specUrl: string = "/api/docs/json"): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=5" />
  <title>${this.config.info.title} - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "${specUrl}",
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`;
	}

	// ─── 내부 메서드 ──────────────────────────────────

	/** BunIgniter :param → OpenAPI {param} 변환 */
	private convertPathToOpenApi(path: string): string {
		return path.replace(/:(\w+)/g, "{$1}");
	}

	/** 파라미터 추출 */
	private extractParameters(
		openApiPath: string,
		method: string,
	): any[] {
		const params: any[] = [];

		// 경로 파라미터
		const pathParams = openApiPath.match(/\{(\w+)\}/g);
		if (pathParams) {
			for (const param of pathParams) {
				const name = param.replace(/[{}]/g, "");
				params.push({
					name,
					in: "path",
					required: true,
					schema: { type: "integer" },
				});
			}
		}

		// 쿼리 파라미터 (GET에만)
		if (method === "GET") {
			params.push({
				name: "page",
				in: "query",
				required: false,
				schema: { type: "integer", default: 1 },
				description: "페이지 번호",
			});
		}

		return params;
	}

	/** 기본 응답 생성 */
	private defaultResponses(method: string): Record<string, any> {
		const responses: Record<string, any> = {};

		if (method === "GET") {
			responses["200"] = {
				description: "성공",
				content: {
					"application/json": {
						schema: { type: "object" },
					},
				},
			};
		} else if (method === "POST") {
			responses["201"] = { description: "생성됨" };
			responses["422"] = { description: "유효성 검사 실패" };
		} else if (method === "PUT" || method === "PATCH") {
			responses["200"] = { description: "수정됨" };
		} else if (method === "DELETE") {
			responses["200"] = { description: "삭제됨" };
		}

		responses["404"] = { description: "리소스를 찾을 수 없음" };
		responses["500"] = { description: "서버 오류" };

		return responses;
	}

	/** 첫 글자 대문자 */
	private capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}
}
