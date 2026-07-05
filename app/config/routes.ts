// ============================================================
// BunIgniter - 라우트 설정
// app/config/routes.ts
// CodeIgniter3 의 application/config/routes.php 와 동일
// ============================================================

import { Router } from "system/core/router.ts";
import welcomeController from "app/controllers/welcome_controller.ts";

const router = new Router();

// ─── 기본 라우트 ───────────────────────────────────
router.get("/", welcomeController, "index");

// ─── 라우트 정의 예시 ──────────────────────────────
// router.get("/about", welcomeController, "about");
// router.resource("posts", postsController);
// router.get("/users/:id", usersController, "show");
// router.post("/users", usersController, "store");

export default router;
