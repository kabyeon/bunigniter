import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { Model } from "system/core/model.ts";

interface UserRow {
	id: number;
	email: string;
	password: string;
	name: string;
	role: string;
}

class UserModel extends Model<UserRow> {
	override tableName = "users";
}

const userModel = new UserModel();

/**
 * Auth API 컨트롤러
 * QueryBuilder (Active Record) 패턴 사용
 */
export class ApiAuthController extends Controller {
	// POST /api/auth/login — API 로그인
	async login({ body, response }: Context) {
		const data = body();

		if (!data.email || !data.password) {
			return response.status(422).json({
				error: "Validation Error",
				message: "email과 password는 필수입니다",
			});
		}

		const user = await userModel.qb()
			.select("id, email, password, name, role")
			.where("email", data.email)
			.first<UserRow>();

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

		// 간단한 토큰 생성
		const token = await Bun.password.hash(
			`${user.id}:${Date.now()}`,
			{ algorithm: "bcrypt", cost: 4 },
		);

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

	// GET /api/auth/me — 현재 사용자 정보
	async me({ request, response }: Context) {
		const authHeader = request.headers.get("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return response.status(401).json({
				error: "Unauthorized",
				message: "인증 토큰이 필요합니다",
			});
		}

		// 데모: admin 사용자 반환
		const user = await userModel.qb()
			.select("id, email, name, role")
			.where("id", 1)
			.first();

		if (!user) {
			return response.status(401).json({
				error: "Unauthorized",
				message: "유효하지 않은 토큰입니다",
			});
		}

		return this.json({ data: user });
	}
}

export default new ApiAuthController();
