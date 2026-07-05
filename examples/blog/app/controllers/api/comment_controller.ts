import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { getDB } from "system/core/database.ts";

/**
 * Comments API 컨트롤러
 * JSON 기반 REST API 엔드포인트
 */
export class ApiCommentController extends Controller {
	// GET /api/posts/:postId/comments — 댓글 목록
	async index({ params, response }: Context) {
		const sql = await getDB();
		const postId = Number(params.postId);

		// 포스트 존재 확인
		const posts = await sql<
			{ id: number }[]
		>`SELECT id FROM posts WHERE id = ${postId}`;
		if (posts.length === 0) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		const comments = await sql<
			{
				id: number;
				post_id: number;
				author_name: string;
				content: string;
				created_at: string;
			}[]
		>`SELECT id, post_id, author_name, content, created_at FROM comments WHERE post_id = ${postId} ORDER BY created_at DESC`;

		return this.json({ data: comments });
	}

	// POST /api/posts/:postId/comments — 댓글 작성
	async store({ body, params, response }: Context) {
		const data = body();
		const postId = Number(params.postId);

		// 필수 필드 검증
		if (!data.author_name || !data.content) {
			return response.status(422).json({
				error: "Validation Error",
				message: "author_name과 content는 필수입니다",
			});
		}

		const sql = await getDB();

		// 포스트 존재 확인
		const posts = await sql<
			{ id: number }[]
		>`SELECT id FROM posts WHERE id = ${postId}`;
		if (posts.length === 0) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		await sql`INSERT INTO comments (post_id, author_name, content) VALUES (${postId}, ${data.author_name}, ${data.content})`;

		const [comment] = await sql<
			{
				id: number;
				post_id: number;
				author_name: string;
				content: string;
				created_at: string;
			}[]
		>`SELECT id, post_id, author_name, content, created_at FROM comments WHERE post_id = ${postId} ORDER BY created_at DESC LIMIT 1`;

		return this.json({ data: comment }, 201);
	}

	// DELETE /api/comments/:id — 댓글 삭제
	async delete({ params, response }: Context) {
		const id = Number(params.id);
		const sql = await getDB();

		const existing = await sql<
			{ id: number }[]
		>`SELECT id FROM comments WHERE id = ${id}`;
		if (existing.length === 0) {
			return response.status(404).json({
				error: "Not Found",
				message: "댓글을 찾을 수 없습니다",
			});
		}

		await sql`DELETE FROM comments WHERE id = ${id}`;

		return this.json({ data: { deleted: true, id } });
	}
}

export default new ApiCommentController();
