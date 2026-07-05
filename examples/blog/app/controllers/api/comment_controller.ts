import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { Model } from "system/core/model.ts";

interface CommentRow {
	id: number;
	post_id: number;
	author_name: string;
	content: string;
	created_at: string;
}

class CommentModel extends Model<CommentRow> {
	override tableName = "comments";
}

const commentModel = new CommentModel();

/**
 * Comments API 컨트롤러
 * QueryBuilder (Active Record) 패턴 사용
 */
export class ApiCommentController extends Controller {
	// GET /api/posts/:postId/comments — 댓글 목록
	async index({ params, response }: Context) {
		const postId = Number(params.postId);

		// 포스트 존재 확인
		const exists = await commentModel.qb()
			.from("posts")
			.where("id", postId)
			.exists();

		if (!exists) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		const comments = await commentModel.qb()
			.select("id, post_id, author_name, content, created_at")
			.where("post_id", postId)
			.orderBy("created_at", "DESC")
			.get<CommentRow>();

		return this.json({ data: comments });
	}

	// POST /api/posts/:postId/comments — 댓글 작성
	async store({ body, params, response }: Context) {
		const data = body();
		const postId = Number(params.postId);

		if (!data.author_name || !data.content) {
			return response.status(422).json({
				error: "Validation Error",
				message: "author_name과 content는 필수입니다",
			});
		}

		// 포스트 존재 확인
		const exists = await commentModel.qb()
			.from("posts")
			.where("id", postId)
			.exists();

		if (!exists) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		const comment = await commentModel.create({
			post_id: postId,
			author_name: data.author_name,
			content: data.content,
		} as any);

		return this.json({ data: comment }, 201);
	}

	// DELETE /api/comments/:id — 댓글 삭제
	async delete({ params, response }: Context) {
		const id = Number(params.id);
		const deleted = await commentModel.delete(id);

		if (!deleted) {
			return response.status(404).json({
				error: "Not Found",
				message: "댓글을 찾을 수 없습니다",
			});
		}

		return this.json({ data: { deleted: true, id } });
	}
}

export default new ApiCommentController();
