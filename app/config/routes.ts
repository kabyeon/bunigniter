// ============================================================
// BunIgniter - 라우트 설정
// app/config/routes.ts
// CodeIgniter3 의 application/config/routes.php 와 동일
// ============================================================

import welcomeController from "app/controllers/welcome_controller.ts";
import { Router } from "system/core/router.ts";

const router = new Router();

// ─── 기본 라우트 ───────────────────────────────────
router.get("/", welcomeController, "index");

// ─── 오토 라우트 (CI3 호환) ──────────────────────
// URL → Controller/Method 자동 매핑
//   /posts       → PostController::index()
//   /posts/show/5 → PostController::show(5)
//   /products    → ProductController::index()
//
// 명시적 라우트가 오토 라우트보다 우선합니다.
// 비활성화하려면: router.autoRoute({ enabled: false })
router.autoRoute();

// ─── 명시적 라우트 (오토 라우트보다 우선) ────────
// router.get("/about", welcomeController, "about");
// router.resource("posts", postsController);
// router.get("/users/:id", usersController, "show");
// router.post("/users", usersController, "store");

export default router;
