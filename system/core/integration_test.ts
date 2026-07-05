// ============================================================
// BunIgniter - Integration Test Helpers
// 서버 기동 + HTTP 요청 자동화
// 통합 테스트 작성을 위한 헬퍼
// Bun.serve 네이티브 서버 기반
// ============================================================

export interface IntegrationTestServer {
	url: string;
	server: any;
	close: () => void;
}

/**
 * 통합 테스트용 서버를 시작합니다.
 * 실제 Bun.serve 앱을 기동하고 HTTP 요청을 보낼 수 있습니다.
 *
 * 사용법:
 *   import { startTestServer, stopTestServer } from "system/core/integration_test.ts";
 *
 *   const { url, close } = await startTestServer(3999);
 *
 *   const res = await fetch(`${url}/api/users`);
 *   const data = await res.json();
 *
 *   close();
 */
export async function startTestServer(
	port: number = 3999,
): Promise<IntegrationTestServer> {
	const server = Bun.serve({
		port,
		fetch(_req) {
			return new Response("Test server", { status: 200 });
		},
	});

	// 라우트 등록 시도
	try {
		const router = (await import("../../app/config/routes.ts")).default;
		const { routes, fetch: appFetch } = router.toBunServe();

		// 라우트가 있으면 서버 재시작
		server.stop();
		const newServer = Bun.serve({
			port,
			routes,
			fetch(req) {
				return appFetch(req);
			},
		});

		return {
			url: `http://localhost:${port}`,
			server: newServer,
			close: () => {
				newServer.stop();
			},
		};
	} catch {
		// 라우트 로드 실패 시 기본 서버
	}

	return {
		url: `http://localhost:${port}`,
		server,
		close: () => {
			server.stop();
		},
	};
}

/**
 * 테스트 서버 종료
 */
export function stopTestServer(testServer: IntegrationTestServer): void {
	testServer.close();
}

/**
 * 통합 테스트용 HTTP 요청 헬퍼
 */
export class IntegrationTestClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	/** GET 요청 */
	async get(path: string, headers?: Record<string, string>): Promise<Response> {
		return fetch(`${this.baseUrl}${path}`, {
			method: "GET",
			headers: { "Content-Type": "application/json", ...headers },
		});
	}

	/** POST 요청 */
	async post(
		path: string,
		body?: any,
		headers?: Record<string, string>,
	): Promise<Response> {
		return fetch(`${this.baseUrl}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...headers },
			body: body ? JSON.stringify(body) : undefined,
		});
	}

	/** PUT 요청 */
	async put(
		path: string,
		body?: any,
		headers?: Record<string, string>,
	): Promise<Response> {
		return fetch(`${this.baseUrl}${path}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...headers },
			body: body ? JSON.stringify(body) : undefined,
		});
	}

	/** PATCH 요청 */
	async patch(
		path: string,
		body?: any,
		headers?: Record<string, string>,
	): Promise<Response> {
		return fetch(`${this.baseUrl}${path}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...headers },
			body: body ? JSON.stringify(body) : undefined,
		});
	}

	/** DELETE 요청 */
	async delete(
		path: string,
		headers?: Record<string, string>,
	): Promise<Response> {
		return fetch(`${this.baseUrl}${path}`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json", ...headers },
		});
	}

	/** 폼 데이터 POST */
	async postForm(
		path: string,
		fields: Record<string, string>,
	): Promise<Response> {
		const formData = new FormData();
		for (const [key, value] of Object.entries(fields)) {
			formData.append(key, value);
		}
		return fetch(`${this.baseUrl}${path}`, {
			method: "POST",
			body: formData,
		});
	}

	/** JSON 응답 파싱 */
	async getJson(path: string): Promise<any> {
		const res = await this.get(path);
		return res.json();
	}

	/** 상태 코드 확인 */
	async assertStatus(
		path: string,
		expectedStatus: number,
		method: string = "GET",
	): Promise<boolean> {
		const res = await fetch(`${this.baseUrl}${path}`, { method });
		return res.status === expectedStatus;
	}
}

/**
 * 통합 테스트 클라이언트 팩토리
 *
 * 사용법:
 *   const { client, close } = await createIntegrationTestClient();
 *
 *   const res = await client.get("/users");
 *   const data = await res.json();
 *
 *   close();
 */
export async function createIntegrationTestClient(
	port: number = 3999,
): Promise<{
	client: IntegrationTestClient;
	close: () => void;
}> {
	const { url, close } = await startTestServer(port);
	const client = new IntegrationTestClient(url);
	return { client, close };
}
