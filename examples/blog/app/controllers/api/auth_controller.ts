import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { getDB } from "system/core/database.ts";

/**
 * Auth API 컨트롤러
 * JSON 기반 인증 API
 */
export class ApiAuthController extends Controller {
	// POST /api/auth/login — API 로그인 (토큰 반환)
	async login({ body, response }: Context) {
		const data = body();

		if (!data.email || !data.password) {
			return response.status(422).json({
				error: "Validation Error",
				message: "email과 password는 필수입니다",
			});
		}

		const sql = await getDB();
		const users = await sql<
			{
				id: number;
				email: string;
				password: string;
				name: string;
				role: string;
			}[]
		>`SELECT id, email, password, name, role FROM users WHERE email = ${data.email}`;

		const user = users[0];
		if (!user) {
			return response.status(401).json({
				error: "Unauthorized",
				message: "이메일 또는 비밀번호가 올바르지 않습니다",
			});
		}

		const valid = await Bun.password.verify(data.password, user.password);
		if (!valid) {
			return response.status(401).json({
				error: "Unauthorized",
				message: "이메일 또는 비밀번호가 올바르지 않습니다",
			});
		}

		// 간단한 토큰 생성 (실제 프로덕션에서는 JWT 등 사용)
		const token = await Bun.password.hash(`${user.id}:${Date.now()}`, {
			algorithm: "bcrypt",
			cost: 4,
		});

		return this.json({
			data: {
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
				},
				token,
			},
		});
	}

	// GET /api/auth/me — 현재 사용자 정보 (간이 구현)
	async me({ request, response }: Context) {
		const authHeader = request.headers.get("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return response.status(401).json({
				error: "Unauthorized",
				message: "인증 토큰이 필요합니다",
			});
		}

		// 간이 구현: 실제로는 토큰 검증 필요
		// 데모에서는 항상 admin 사용자 반환
		const sql = await getDB();
		const users = await sql<
			{ id: number; email: string; name: string; role: string }[]
		>`SELECT id, email, name, role FROM users WHERE id = 1`;

		if (users.length === 0) {
			return response.status(401).json({
				error: "Unauthorized",
				message: "유효하지 않은 토큰입니다",
			});
		}

		return this.json({ data: users[0] });
	}
}

export default new ApiAuthController();
