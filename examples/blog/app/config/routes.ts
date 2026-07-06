import authController from "app/controllers/auth_controller.ts";
import commentController from "app/controllers/comment_controller.ts";
import postController from "app/controllers/post_controller.ts";
import { Router } from "system/core/router.ts";

const router = new Router();

// ─── 공개 라우트 ──────────────────────────────────
router.get("/", postController, "index");
router.get("/posts/:slug", postController, "show");
router.post("/posts/:postId/comments", commentController, "store");

// ─── 인증 ────────────────────────────────────────
router.get("/login", authController, "loginForm");
router.post("/login", authController, "login");
router.get("/logout", authController, "logout");

// ─── 관리 ────────────────────────────────────────
router.get("/admin/posts", postController, "admin");
router.get("/admin/posts/create", postController, "create");
router.post("/admin/posts", postController, "store");
router.get("/admin/posts/:id/edit", postController, "edit");
router.put("/admin/posts/:id", postController, "update");
router.delete("/admin/posts/:id", postController, "delete");

export default router;
