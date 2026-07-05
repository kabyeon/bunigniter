// ============================================================
// BunIgniter - Session Driver Interface
// 세션 드라이버 추상화 인터페이스
// MemorySession, FileSession, RedisSession 등 교체 가능
// ============================================================

/**
 * 세션 드라이버 인터페이스
 * 모든 세션 드라이버는 이 인터페이스를 구현해야 합니다.
 */
export interface SessionDriver {
	/** 세션 데이터 설정 */
	set(key: string, value: any): void;
	/** 세션 데이터 조회 */
	get(key: string): any;
	/** 세션 데이터 존재 여부 */
	has(key: string): boolean;
	/** 세션 데이터 삭제 */
	remove(key: string): void;
	/** 전체 세션 데이터 */
	all(): Record<string, any>;
	/** Flash 데이터 설정 (1회성) */
	flash(key: string, value: any): void;
	/** Flash 데이터 조회 후 삭제 */
	getFlash(key: string): any;
	/** 세션 ID 반환 */
	getId(): string;
	/** 세션 저장 (명시적) */
	save(): void;
	/** 세션 파기 */
	destroy(): void;
	/** 쿠키 헤더 값 생성 */
	getCookieHeader(expiration?: number): string;
}

/**
 * 세션 설정 인터페이스
 */
export interface SessionConfig {
	/** 드라이버 타입: "memory" | "file" | "redis" */
	driver: string;
	/** 세션 쿠키명 */
	cookieName: string;
	/** 세션 만료시간 (초) */
	expiration: number;
	/** 파일 세션 경로 (file 드라이버) */
	path?: string;
	/** Redis 연결 URL (redis 드라이버) */
	redisUrl?: string;
}
