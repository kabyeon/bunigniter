import apiRouter from "app/config/api_routes.ts";
import type { OpenApiConfig } from "system/core/openapi.ts";
import { OpenApiGenerator } from "system/core/openapi.ts";

export const openApiConfig: OpenApiConfig = {
	info: {
		title: "BunIgniter Blog API",
		description:
			"BunIgniter 프레임워크 기반 블로그 REST API. 포스트 CRUD, 댓글, 인증 기능을 제공합니다.",
		version: "1.0.0",
	},
	servers: [
		{
			url: "http://localhost:3001",
			description: "개발 서버",
		},
	],
	securitySchemes: {
		bearerAuth: {
			type: "http",
			scheme: "bearer",
			bearerFormat: "JWT",
			description: "API 인증 토큰 (POST /api/auth/login으로 발급)",
		},
	},
};

export const openApiGenerator = new OpenApiGenerator(openApiConfig);

// ─── Posts API 문서 ──────────────────────────────
openApiGenerator.describe("GET", "/api/posts", {
	summary: "공개 포스트 목록 조회",
	description: "페이지네이션을 지원하는 공개 포스트 목록을 반환합니다.",
	tags: ["Posts"],
	parameters: [
		{
			name: "page",
			in: "query",
			required: false,
			schema: { type: "integer", default: 1 },
			description: "페이지 번호",
		},
		{
			name: "per_page",
			in: "query",
			required: false,
			schema: { type: "integer", default: 10 },
			description: "페이지당 포스트 수",
		},
	],
	responses: {
		"200": {
			description: "포스트 목록",
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							data: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "integer" },
										title: { type: "string" },
										slug: { type: "string" },
										excerpt: { type: "string" },
										author_name: { type: "string" },
										published: { type: "integer" },
										created_at: { type: "string" },
										updated_at: { type: "string" },
									},
								},
							},
							meta: {
								type: "object",
								properties: {
									page: { type: "integer" },
									per_page: { type: "integer" },
									total: { type: "integer" },
									total_pages: { type: "integer" },
									has_next: { type: "boolean" },
									has_prev: { type: "boolean" },
								},
							},
						},
					},
				},
			},
		},
	},
});

openApiGenerator.describe("GET", "/api/posts/:id", {
	summary: "포스트 상세 조회",
	description: "ID로 포스트를 조회합니다. 댓글도 함께 반환합니다.",
	tags: ["Posts"],
	parameters: [
		{
			name: "id",
			in: "path",
			required: true,
			schema: { type: "integer" },
			description: "포스트 ID",
		},
	],
	responses: {
		"200": {
			description: "포스트 상세 + 댓글",
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							data: {
								type: "object",
								properties: {
									id: { type: "integer" },
									title: { type: "string" },
									slug: { type: "string" },
									content: { type: "string" },
									excerpt: { type: "string" },
									author_name: { type: "string" },
									comments: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "integer" },
												author_name: { type: "string" },
												content: { type: "string" },
												created_at: { type: "string" },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		"404": {
			description: "포스트를 찾을 수 없음",
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							error: { type: "string" },
							message: { type: "string" },
						},
					},
				},
			},
		},
	},
});

openApiGenerator.describe("POST", "/api/posts", {
	summary: "포스트 생성",
	description: "새 포스트를 생성합니다. 인증이 필요합니다.",
	tags: ["Posts"],
	security: [{ bearerAuth: [] }],
	requestBody: {
		required: true,
		content: {
			"application/json": {
				schema: {
					type: "object",
					required: ["title"],
					properties: {
						title: { type: "string", description: "포스트 제목" },
						slug: {
							type: "string",
							description: "포스트 슬러그 (미지정시 자동 생성)",
						},
						content: {
							type: "string",
							description: "포스트 본문",
						},
						excerpt: {
							type: "string",
							description: "포스트 요약",
						},
						author_id: {
							type: "integer",
							description: "작성자 ID",
							default: 1,
						},
						published: {
							type: "integer",
							description: "공개 여부 (0=비공개, 1=공개)",
							default: 0,
						},
					},
				},
			},
		},
	},
	responses: {
		"201": {
			description: "포스트 생성 성공",
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							data: {
								type: "object",
								properties: {
									id: { type: "integer" },
									title: { type: "string" },
									slug: { type: "string" },
								},
							},
						},
					},
				},
			},
		},
		"409": {
			description: "슬러그 중복",
		},
		"422": {
			description: "유효성 검사 실패 (title 필수)",
		},
	},
});

openApiGenerator.describe("PUT", "/api/posts/:id", {
	summary: "포스트 수정",
	description: "포스트를 수정합니다. 인증이 필요합니다.",
	tags: ["Posts"],
	security: [{ bearerAuth: [] }],
	parameters: [
		{
			name: "id",
			in: "path",
			required: true,
			schema: { type: "integer" },
			description: "포스트 ID",
		},
	],
	requestBody: {
		required: true,
		content: {
			"application/json": {
				schema: {
					type: "object",
					properties: {
						title: { type: "string" },
						content: { type: "string" },
						excerpt: { type: "string" },
						published: { type: "integer" },
					},
				},
			},
		},
	},
	responses: {
		"200": { description: "포스트 수정 성공" },
		"404": { description: "포스트를 찾을 수 없음" },
	},
});

openApiGenerator.describe("DELETE", "/api/posts/:id", {
	summary: "포스트 삭제",
	description: "포스트를 삭제합니다. 인증이 필요합니다.",
	tags: ["Posts"],
	security: [{ bearerAuth: [] }],
	parameters: [
		{
			name: "id",
			in: "path",
			required: true,
			schema: { type: "integer" },
			description: "포스트 ID",
		},
	],
	responses: {
		"200": { description: "포스트 삭제 성공" },
		"404": { description: "포스트를 찾을 수 없음" },
	},
});

// ─── Comments API 문서 ────────────────────────────
openApiGenerator.describe("GET", "/api/posts/:postId/comments", {
	summary: "댓글 목록 조회",
	description: "특정 포스트의 댓글 목록을 반환합니다.",
	tags: ["Comments"],
	parameters: [
		{
			name: "postId",
			in: "path",
			required: true,
			schema: { type: "integer" },
			description: "포스트 ID",
		},
	],
	responses: {
		"200": { description: "댓글 목록" },
		"404": { description: "포스트를 찾을 수 없음" },
	},
});

openApiGenerator.describe("POST", "/api/posts/:postId/comments", {
	summary: "댓글 작성",
	description: "특정 포스트에 댓글을 작성합니다.",
	tags: ["Comments"],
	parameters: [
		{
			name: "postId",
			in: "path",
			required: true,
			schema: { type: "integer" },
			description: "포스트 ID",
		},
	],
	requestBody: {
		required: true,
		content: {
			"application/json": {
				schema: {
					type: "object",
					required: ["author_name", "content"],
					properties: {
						author_name: { type: "string", description: "댓글 작성자 이름" },
						content: { type: "string", description: "댓글 내용" },
					},
				},
			},
		},
	},
	responses: {
		"201": { description: "댓글 생성 성공" },
		"404": { description: "포스트를 찾을 수 없음" },
		"422": { description: "유효성 검사 실패" },
	},
});

openApiGenerator.describe("DELETE", "/api/comments/:id", {
	summary: "댓글 삭제",
	description: "댓글을 삭제합니다. 인증이 필요합니다.",
	tags: ["Comments"],
	security: [{ bearerAuth: [] }],
	parameters: [
		{
			name: "id",
			in: "path",
			required: true,
			schema: { type: "integer" },
			description: "댓글 ID",
		},
	],
	responses: {
		"200": { description: "댓글 삭제 성공" },
		"404": { description: "댓글을 찾을 수 없음" },
	},
});

// ─── Auth API 문서 ────────────────────────────────
openApiGenerator.describe("POST", "/api/auth/login", {
	summary: "API 로그인",
	description: "이메일/비밀번호로 인증하고 API 토큰을 발급받습니다.",
	tags: ["Auth"],
	requestBody: {
		required: true,
		content: {
			"application/json": {
				schema: {
					type: "object",
					required: ["email", "password"],
					properties: {
						email: { type: "string", format: "email" },
						password: { type: "string", format: "password" },
					},
				},
			},
		},
	},
	responses: {
		"200": {
			description: "로그인 성공",
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							data: {
								type: "object",
								properties: {
									user: {
										type: "object",
										properties: {
											id: { type: "integer" },
											email: { type: "string" },
											name: { type: "string" },
											role: { type: "string" },
										},
									},
									token: { type: "string" },
								},
							},
						},
					},
				},
			},
		},
		"401": { description: "인증 실패" },
		"422": { description: "유효성 검사 실패" },
	},
});

openApiGenerator.describe("GET", "/api/auth/me", {
	summary: "현재 사용자 정보",
	description: "인증 토큰으로 현재 사용자 정보를 조회합니다.",
	tags: ["Auth"],
	security: [{ bearerAuth: [] }],
	responses: {
		"200": {
			description: "사용자 정보",
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							data: {
								type: "object",
								properties: {
									id: { type: "integer" },
									email: { type: "string" },
									name: { type: "string" },
									role: { type: "string" },
								},
							},
						},
					},
				},
			},
		},
		"401": { description: "인증 토큰 필요" },
	},
});

// ─── 스펙 및 Swagger UI ──────────────────────────
export function getOpenApiSpec(): Record<string, any> {
	return openApiGenerator.generate(apiRouter);
}

export function getSwaggerUiHtml(): string {
	return openApiGenerator.swaggerUiHtml("/api/docs/json");
}
