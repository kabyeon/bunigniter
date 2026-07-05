// ============================================================
// BunIgniter - Auth Library
// CodeIgniter3 의 간소화된 인증 라이브러리
// 세션 기반 인증 + bcrypt 패스워드 해싱
// SessionDriver 인터페이스 기반으로 리팩토링
// ============================================================

import { createSession } from "./session_manager.ts";
import type { SessionDriver } from "./session_driver.ts";
import { getDB } from "./database.ts";

export interface AuthUser {
	id: number;
	email: string;
	name?: string;
	[key: string]: any;
}

export interface AuthResult {
	success: boolean;
	user?: AuthUser;
	error?: string;
}

/** Auth에서 사용할 세션 설정 */
const AUTH_SESSION_CONFIG = {
	driver: "file" as const,
	cookieName: "bunigniter_session",
	expiration: 7200,
};

/**
 * 인증 라이브러리
 *
 * 사용법:
 *   // 로그인
 *   const result = await Auth.attempt(request, "alice@example.com", "password123");
 *
 *   // 사용자 확인
 *   const user = await Auth.user(request);
 *
 *   // 로그인 상태 확인
 *   const isLoggedIn = await Auth.check(request);
 *
 *   // 로그아웃
 *   Auth.logout(request);
 */
export class Auth {
	private static USER_SESSION_KEY = "auth_user_id";

	/** 세션 드라이버 생성 (설정에 따라 자동 선택) */
	private static getSession(request: Request): SessionDriver {
		return createSession(request, AUTH_SESSION_CONFIG);
	}

	/**
	 * 이메일/비밀번호로 로그인 시도
	 */
	static async attempt(
		request: Request,
		email: string,
		password: string,
		tableName: string = "users",
	): Promise<AuthResult> {
		const sql = await getDB();

		const users =
			await sql`SELECT * FROM ${sql(tableName)} WHERE email = ${email}`;
		const user = users[0] as AuthUser | undefined;

		if (!user) {
			return { success: false, error: "사용자를 찾을 수 없습니다" };
		}

		if (user.password) {
			const valid = await Auth.verifyPassword(password, user.password);
			if (!valid) {
				return { success: false, error: "비밀번호가 일치하지 않습니다" };
			}
		}

		const session = Auth.getSession(request);
		session.set(Auth.USER_SESSION_KEY, user.id);
		session.set("auth_user", {
			id: user.id,
			email: user.email,
			name: user.name,
		});
		session.save();

		const { password: _, ...safeUser } = user;
		return { success: true, user: safeUser as AuthUser };
	}

	/**
	 * 사용자 ID로 직접 로그인
	 */
	static async loginById(
		request: Request,
		userId: number,
		tableName: string = "users",
	): Promise<AuthResult> {
		const sql = await getDB();
		const users =
			await sql`SELECT * FROM ${sql(tableName)} WHERE id = ${userId}`;
		const user = users[0] as AuthUser | undefined;

		if (!user) {
			return { success: false, error: "사용자를 찾을 수 없습니다" };
		}

		const session = Auth.getSession(request);
		session.set(Auth.USER_SESSION_KEY, user.id);
		session.set("auth_user", {
			id: user.id,
			email: user.email,
			name: user.name,
		});
		session.save();

		const { password: _, ...safeUser } = user;
		return { success: true, user: safeUser as AuthUser };
	}

	/**
	 * 로그인 상태 확인
	 */
	static check(request: Request): boolean {
		const session = Auth.getSession(request);
		return session.has(Auth.USER_SESSION_KEY);
	}

	/**
	 * 현재 로그인한 사용자 조회
	 */
	static user(request: Request): AuthUser | null {
		const session = Auth.getSession(request);
		return session.get("auth_user") ?? null;
	}

	/**
	 * 현재 로그인한 사용자 ID
	 */
	static id(request: Request): number | null {
		const session = Auth.getSession(request);
		return session.get(Auth.USER_SESSION_KEY) ?? null;
	}

	/**
	 * 로그아웃
	 */
	static logout(request: Request): void {
		const session = Auth.getSession(request);
		session.remove(Auth.USER_SESSION_KEY);
		session.remove("auth_user");
		session.save();
	}

	/**
	 * 비밀번호 해싱 (bcrypt)
	 */
	static async hashPassword(password: string): Promise<string> {
		return await Bun.password.hash(password, {
			algorithm: "bcrypt",
			cost: 10,
		});
	}

	/**
	 * 비밀번호 검증
	 */
	static async verifyPassword(
		password: string,
		hash: string,
	): Promise<boolean> {
		return await Bun.password.verify(password, hash, "bcrypt");
	}
}

/**
 * 인증 미들웨어
 * 로그인하지 않은 사용자를 /login 으로 리다이렉트합니다.
 */
export async function authGuard({
	request,
	next,
}: {
	request: Request;
	response: any;
	next: () => Promise<Response | void>;
}): Promise<Response | void> {
	if (!Auth.check(request)) {
		return new Response(null, {
			status: 302,
			headers: { Location: "/login" },
		});
	}
	return next();
}

/**
 * 게스트 미들웨어
 * 이미 로그인한 사용자를 홈으로 리다이렉트합니다.
 */
export async function guestGuard({
	request,
	next,
}: {
	request: Request;
	response: any;
	next: () => Promise<Response | void>;
}): Promise<Response | void> {
	if (Auth.check(request)) {
		return new Response(null, {
			status: 302,
			headers: { Location: "/" },
		});
	}
	return next();
}
