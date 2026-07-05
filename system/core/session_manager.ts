// ============================================================
// BunIgniter - Session Manager
// 세션 드라이버 팩토리 + 매니저
// 설정에 따라 Memory/File/Redis 드라이버를 자동 선택
// ============================================================

import type { SessionDriver, SessionConfig } from "./session_driver.ts";
import { MemorySession } from "./memory_session.ts";
import { FileSession } from "./file_session.ts";
import { RedisSession } from "./redis_session.ts";

/** 기본 세션 설정 */
const DEFAULT_CONFIG: SessionConfig = {
	driver: "memory",
	cookieName: "bunigniter_session",
	expiration: 7200,
};

/**
 * 설정에 따라 세션 드라이버를 생성합니다.
 *
 * 사용법:
 *   import { createSession } from "system/core/session_manager.ts";
 *
 *   // app/config/app.ts 의 session 설정에 따라 자동 선택
 *   const session = createSession(request, {
 *     driver: "file",
 *     cookieName: "bunigniter_session",
 *     expiration: 7200,
 *   });
 *
 *   session.set("userId", 42);
 *   session.save();
 */
export async function createSession(
	request: Request,
	config?: Partial<SessionConfig>,
): Promise<SessionDriver> {
	const merged: SessionConfig = { ...DEFAULT_CONFIG, ...config };

	switch (merged.driver) {
		case "file":
			return new FileSession(request, {
				sessionDir: merged.path,
				cookieName: merged.cookieName,
			});

		case "memory":
			return new MemorySession(request, merged.cookieName);

		case "redis": {
			const session = new RedisSession(request, {
				redisUrl: merged.redisUrl,
				cookieName: merged.cookieName,
				expiration: merged.expiration,
			});
			await session.load();
			return session;
		}

		default:
			console.warn(
				`[BunIgniter] Unknown session driver "${merged.driver}". Falling back to memory driver.`,
			);
			return new MemorySession(request, merged.cookieName);
	}
}

/**
 * 현재 설정된 세션 드라이버 타입 이름 반환
 */
export function getSessionDriverName(config?: Partial<SessionConfig>): string {
	return (config ?? DEFAULT_CONFIG).driver ?? "memory";
}
