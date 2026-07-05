// ============================================================
// BunIgniter - Session 클래스
// CodeIgniter3 의 $this->session 과 동일
// 쿠키 기반 세션 (Bun 환경에 맞게 간소화)
// ============================================================

export interface SessionData {
	[key: string]: any;
}

const SESSION_COOKIE_NAME = "bunigniter_session";
const sessions = new Map<string, SessionData>();

function generateSessionId(): string {
	return crypto.randomUUID();
}

/**
 * 세션 ID 유효성 검증 (UUID v4 형식)
 * 조작된 세션 ID로 인한 경로 순회 등을 방지
 */
function isValidSessionId(sid: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		sid,
	);
}

/**
 * 세션 관리
 * CodeIgniter3:
 *   $this->session->set_userdata('key', 'value');
 *   $this->session->userdata('key');
 */
export class Session {
	private sessionId: string = "";
	private data: SessionData = {};

	constructor(request: Request) {
		const cookies = this.parseCookies(request);
		const sid = cookies[SESSION_COOKIE_NAME];

		if (sid && isValidSessionId(sid) && sessions.has(sid)) {
			this.sessionId = sid;
			this.data = sessions.get(sid) ?? {};
		} else {
			this.sessionId = generateSessionId();
			this.data = {};
		}
	}

	/** 세션 데이터 설정 */
	set(key: string, value: any): void {
		this.data[key] = value;
		this.save();
	}

	/** 세션 데이터 조회 */
	get(key: string): any {
		return this.data[key];
	}

	/** 세션 데이터 존재 여부 */
	has(key: string): boolean {
		return key in this.data;
	}

	/** 세션 데이터 삭제 */
	remove(key: string): void {
		delete this.data[key];
		this.save();
	}

	/** 전체 세션 데이터 */
	all(): SessionData {
		return { ...this.data };
	}

	/** Flash 데이터 설정 (1회성) */
	flash(key: string, value: any): void {
		this.data[`__flash_${key}`] = value;
		this.save();
	}

	/** Flash 데이터 조회 후 삭제 */
	getFlash(key: string): any {
		const flashKey = `__flash_${key}`;
		const value = this.data[flashKey];
		if (value !== undefined) {
			delete this.data[flashKey];
			this.save();
		}
		return value;
	}

	/** 세션 ID 반환 */
	getId(): string {
		return this.sessionId;
	}

	/** 쿠키 헤더 값 생성 */
	getCookieHeader(): string {
		this.save();
		return `${SESSION_COOKIE_NAME}=${this.sessionId}; Path=/; HttpOnly; SameSite=Lax`;
	}

	/** 세션 파기 */
	destroy(): void {
		sessions.delete(this.sessionId);
		this.data = {};
		this.sessionId = generateSessionId();
	}

	/**
	 * 세션 ID 재생성 (세션 고정 공격 방어)
	 * 로그인 성공 후 호출하여 공격자가 알고 있는 세션 ID를 무효화합니다.
	 * 기존 세션 데이터는 새 ID로 이전됩니다.
	 */
	regenerateId(): void {
		const oldId = this.sessionId;
		this.sessionId = generateSessionId();
		// 이전 세션 삭제
		sessions.delete(oldId);
		// 데이터는 유지한 채 새 ID로 저장
		this.save();
	}

	private save(): void {
		sessions.set(this.sessionId, this.data);
	}

	private parseCookies(request: Request): Record<string, string> {
		const cookieHeader = request.headers.get("cookie") ?? "";
		const cookies: Record<string, string> = {};
		for (const pair of cookieHeader.split(";")) {
			const [key, ...rest] = pair.split("=");
			if (key) cookies[key.trim()] = rest.join("=").trim();
		}
		return cookies;
	}
}
