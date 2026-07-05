import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { Auth } from "system/core/auth.ts";

/** 허용된 리다이렉트 경로인지 검증 (오픈 리다이렉트 방지) */
function safeRedirect(url: string): string {
	if (url.startsWith("/") && !url.startsWith("//")) return url;
	return "/";
}

/** 검증된 경로로 302 리다이렉트 응답 생성 */
function redirect(url: string): Response {
	return new Response(null, { status: 302, headers: { Location: safeRedirect(url) } });
}

export class AuthController extends Controller {
	// GET /login
	async loginForm({}: Context) {
		return this.view("auth/login", {
			title: "로그인",
			error: "",
		});
	}

	// POST /login
	async login({ body, request }: Context) {
		const data = body();
		const result = await Auth.attempt(request, data.email, data.password);

		if (!result.success) {
			return this.view("auth/login", {
				title: "로그인",
				error: result.error,
			});
		}

		return redirect("/admin/posts");
	}

	// GET /logout
	async logout({ request }: Context) {
		await Auth.logout(request);
		return redirect("/");
	}
}

export default new AuthController();
