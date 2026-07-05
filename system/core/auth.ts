// ============================================================
// BunIgniter - Auth Library
// CodeIgniter3 의 간소화된 인증 라이브러리
// 세션 기반 인증 + bcrypt 패스워드 해싱
// ============================================================

import { FileSession } from "./file_session.ts";
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

	/**
	 * 이메일/비밀번호로 로그인 시도
	 * CodeIgniter3: $this->ion_auth->login($identity, $password)
	 */
	static async attempt(
		request: Request,
		email: string,
		password: string,
		tableName: string = "users",
	): Promise<AuthResult> {
		const sql = await getDB();

		// 사용자 조회
		const users =
			await sql`SELECT * FROM ${sql(tableName)} WHERE email = ${email}`;
		const user = users[0] as AuthUser | undefined;

		if (!user) {
			return { success: false, error: "사용자를 찾을 수 없습니다" };
		}

		// 비밀번호 검증 (bcrypt)
		if (user.password) {
			const valid = await Auth.verifyPassword(password, user.password);
			if (!valid) {
				return { success: false, error: "비밀번호가 일치하지 않습니다" };
			}
		}

		// 세션에 사용자 ID 저장
		const session = new FileSession(request);
		session.set(Auth.USER_SESSION_KEY, user.id);
		session.set("auth_user", {
			id: user.id,
			email: user.email,
			name: user.name,
		});
		session.save();

		// 비밀번호 필드 제거 후 반환
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

		const session = new FileSession(request);
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
	 * CodeIgniter3: $this->ion_auth->logged_in()
	 */
	static check(request: Request): boolean {
		const session = new FileSession(request);
		return session.has(Auth.USER_SESSION_KEY);
	}

	/**
	 * 현재 로그인한 사용자 조회
	 * CodeIgniter3: $this->ion_auth->user()->row()
	 */
	static user(request: Request): AuthUser | null {
		const session = new FileSession(request);
		return session.get("auth_user") ?? null;
	}

	/**
	 * 현재 로그인한 사용자 ID
	 */
	static id(request: Request): number | null {
		const session = new FileSession(request);
		return session.get(Auth.USER_SESSION_KEY) ?? null;
	}

	/**
	 * 로그아웃
	 * CodeIgniter3: $this->ion_auth->logout()
	 */
	static logout(request: Request): void {
		const session = new FileSession(request);
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
 *
 * 사용법:
 *   router.resource("admin", adminController, [authGuard]);
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
