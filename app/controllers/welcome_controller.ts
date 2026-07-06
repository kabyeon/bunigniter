// ============================================================
// Welcome Controller
// CodeIgniter3 의 application/controllers/Welcome.php 와 동일
// ============================================================

import type { Context } from "system/core/controller.ts";
import { Controller } from "system/core/controller.ts";

export class WelcomeController extends Controller {
	/**
	 * 기본 페이지
	 * CodeIgniter3: public function index() { ... }
	 */
	async index({ request, response }: Context): Promise<Response> {
		return this.view("welcome/index", {
			title: "🔥 BunIgniter에 오신 것을 환영합니다!",
			appName: "BunIgniter",
			version: "1.0.0",
		});
	}
}

export default new WelcomeController();
