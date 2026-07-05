// ============================================================
// BunIgniter - Input 클래스
// CodeIgniter3 의 $this->input 과 동일
// ============================================================

/**
 * 요청 입력 헬퍼
 * CodeIgniter3: $this->input->post('name')
 * BunIgniter: Input.post(request, 'name')
 */
export class Input {
	/** POST 데이터 가져오기 */
	static async post(request: Request, key?: string): Promise<any> {
		try {
			const body = await request.json();
			return key ? body[key] : body;
		} catch {
			return key ? null : {};
		}
	}

	/** GET 쿼리 파라미터 가져오기 */
	static get(request: Request, key?: string): any {
		try {
			const url = new URL(request.url);
			if (key) return url.searchParams.get(key);
			const params: Record<string, string> = {};
			url.searchParams.forEach((v, k) => {
				params[k] = v;
			});
			return params;
		} catch {
			return key ? null : {};
		}
	}

	/** 헤더 가져오기 */
	static header(request: Request, key: string): string | null {
		return request.headers.get(key);
	}

	/** 요청 메서드 */
	static method(request: Request): string {
		return request.method;
	}

	/** IP 주소 */
	static ip(request: Request): string {
		return (
			request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
			request.headers.get("x-real-ip") ??
			"127.0.0.1"
		);
	}

	/** User Agent */
	static userAgent(request: Request): string {
		return request.headers.get("user-agent") ?? "";
	}

	/** AJAX 요청인지 확인 */
	static isAjax(request: Request): boolean {
		return request.headers.get("x-requested-with") === "XMLHttpRequest";
	}

	/** JSON 요청인지 확인 */
	static isJson(request: Request): boolean {
		const ct = request.headers.get("content-type") ?? "";
		return ct.includes("application/json");
	}
}
