import { Router } from "system/core/router.ts";
import apiPostController from "app/controllers/api/post_controller.ts";
import apiCommentController from "app/controllers/api/comment_controller.ts";
import apiAuthController from "app/controllers/api/auth_controller.ts";

const router = new Router();

// ─── Posts API ──────────────────────────────────
router.get("/api/posts", apiPostController, "index");
router.get("/api/posts/:id", apiPostController, "show");
router.post("/api/posts", apiPostController, "store");
router.put("/api/posts/:id", apiPostController, "update");
router.delete("/api/posts/:id", apiPostController, "delete");

// ─── Comments API ────────────────────────────────
router.get("/api/posts/:postId/comments", apiCommentController, "index");
router.post("/api/posts/:postId/comments", apiCommentController, "store");
router.delete("/api/comments/:id", apiCommentController, "delete");

// ─── Auth API ────────────────────────────────────
router.post("/api/auth/login", apiAuthController, "login");
router.get("/api/auth/me", apiAuthController, "me");

export default router;
