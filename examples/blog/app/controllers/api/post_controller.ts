import type { Context } from "system/core/controller.ts";
import { Controller } from "system/core/controller.ts";
import { Model } from "system/core/model.ts";

// ─── 모델 정의 ──────────────────────────────────

interface PostRow {
	id: number;
	title: string;
	slug: string;
	content: string;
	excerpt: string;
	author_name: string;
	published: number;
	author_id: number;
	created_at: string;
	updated_at: string;
}

class PostModel extends Model<PostRow> {
	override tableName = "posts";
}

const postModel = new PostModel();

// ─── API 컨트롤러 ────────────────────────────────

/**
 * Posts API 컨트롤러
 * QueryBuilder (Active Record) 패턴 사용
 */
export class ApiPostController extends Controller {
	// GET /api/posts — 공개 포스트 목록 (페이지네이션)
	async index({ query }: Context) {
		const page = Number(query.page ?? "1");
		const perPage = Number(query.per_page ?? "10");

		const result = await postModel
			.qb()
			.select(
				"p.id, p.title, p.slug, p.excerpt, p.published, p.created_at, p.updated_at, u.name as author_name",
			)
			.from("posts p")
			.join("users u", "u.id = p.author_id")
			.where("p.published", 1)
			.orderBy("p.created_at", "DESC")
			.paginate<PostRow>(page, perPage);

		return this.json(result);
	}

	// GET /api/posts/:id — 포스트 상세
	async show({ params, response }: Context) {
		const post = await postModel
			.qb()
			.select(
				"p.id, p.title, p.slug, p.content, p.excerpt, p.published, p.created_at, p.updated_at, u.name as author_name",
			)
			.from("posts p")
			.join("users u", "u.id = p.author_id")
			.where("p.id", Number(params.id))
			.first<PostRow>();

		if (!post) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		// 댓글도 함께 조회
		const comments = await postModel
			.qb()
			.select("id, author_name, content, created_at")
			.from("comments")
			.where("post_id", post.id)
			.orderBy("created_at", "DESC")
			.get();

		return this.json({ data: { ...post, comments } });
	}

	// POST /api/posts — 포스트 생성
	async store({ body, response }: Context) {
		const data = body();

		if (!data.title) {
			return response.status(422).json({
				error: "Validation Error",
				message: "title은 필수입니다",
			});
		}

		const slug =
			data.slug ??
			data.title
				.toLowerCase()
				.replace(/[^a-z0-9가-힣\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-");

		// 슬러그 중복 확인
		const exists = await postModel.exists({ slug } as any);
		if (exists) {
			return response.status(409).json({
				error: "Conflict",
				message: "이미 존재하는 슬러그입니다",
			});
		}

		const created = await postModel.create({
			title: data.title,
			slug,
			content: data.content ?? "",
			excerpt: data.excerpt ?? "",
			author_id: Number(data.author_id) || 1,
			published: Number(data.published) ?? 0,
		} as any);

		return this.json({ data: { id: created.id, title: created.title, slug: created.slug } }, 201);
	}

	// PUT /api/posts/:id — 포스트 수정
	async update({ body, params, response }: Context) {
		const data = body();
		const id = Number(params.id);

		const existing = await postModel.findById(id);
		if (!existing) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		const updated = await postModel.update(id, {
			title: data.title,
			content: data.content ?? "",
			excerpt: data.excerpt ?? "",
			published: Number(data.published) ?? 0,
			updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
		} as any);

		return this.json({
			data: {
				id: updated?.id,
				title: updated?.title,
				slug: updated?.slug,
				published: updated?.published,
				updated_at: updated?.updated_at,
			},
		});
	}

	// DELETE /api/posts/:id — 포스트 삭제
	async delete({ params, response }: Context) {
		const id = Number(params.id);
		const deleted = await postModel.delete(id);

		if (!deleted) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		return this.json({ data: { deleted: true, id } });
	}
}

export default new ApiPostController();
