import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { getDB } from "system/core/database.ts";

/** 허용된 리다이렉트 경로인지 검증 (오픈 리다이렉트 방지) */
function safeRedirect(url: string): string {
	if (url.startsWith("/") && !url.startsWith("//")) return url;
	return "/";
}

export class CommentController extends Controller {
	// POST /posts/:postId/comments
	async store({ body, params, response }: Context) {
		const data = body();
		const sql = await getDB();

		// 포스트 slug → id 변환
		const posts = await sql`SELECT id FROM posts WHERE slug = ${params.postId}`;
		const post = posts[0] as any;

		if (!post) return response.status(404).send("포스트를 찾을 수 없습니다");

		await sql`INSERT INTO comments (post_id, author_name, content) VALUES (${post.id}, ${data.author_name}, ${data.content})`;

		return new Response(null, {
			status: 302,
			headers: { Location: safeRedirect(`/posts/${params.postId}`) },
		});
	}

	// DELETE /comments/:id
	async delete({ params }: Context) {
		const sql = await getDB();
		await sql`DELETE FROM comments WHERE id = ${Number(params.id)}`;
		return new Response(null, { status: 302, headers: { Location: "/" } });
	}
}

export default new CommentController();
