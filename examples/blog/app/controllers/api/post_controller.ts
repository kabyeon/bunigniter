import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { getDB } from "system/core/database.ts";

/**
 * Posts API 컨트롤러
 * JSON 기반 REST API 엔드포인트
 */
export class ApiPostController extends Controller {
	// GET /api/posts — 공개 포스트 목록 (페이지네이션)
	async index({ query }: Context) {
		const page = Number(query.page ?? "1");
		const perPage = Number(query.per_page ?? "10");
		const offset = (page - 1) * perPage;

		const sql = await getDB();

		const [{ count }] = await sql<
			{ count: number }[]
		>`SELECT COUNT(*) as count FROM posts WHERE published = 1`;

		const posts = await sql<
			{
				id: number;
				title: string;
				slug: string;
				excerpt: string;
				author_name: string;
				published: number;
				created_at: string;
				updated_at: string;
			}[]
		>`SELECT p.id, p.title, p.slug, p.excerpt, p.published, p.created_at, p.updated_at, u.name as author_name FROM posts p JOIN users u ON p.author_id = u.id WHERE p.published = 1 ORDER BY p.created_at DESC LIMIT ${perPage} OFFSET ${offset}`;

		const totalPages = Math.ceil(count / perPage);

		return this.json({
			data: posts,
			meta: {
				page,
				per_page: perPage,
				total: count,
				total_pages: totalPages,
				has_next: page < totalPages,
				has_prev: page > 1,
			},
		});
	}

	// GET /api/posts/:id — 포스트 상세
	async show({ params, response }: Context) {
		const id = Number(params.id);
		const sql = await getDB();
		const posts = await sql<
			{
				id: number;
				title: string;
				slug: string;
				content: string;
				excerpt: string;
				author_name: string;
				published: number;
				created_at: string;
				updated_at: string;
			}[]
		>`SELECT p.id, p.title, p.slug, p.content, p.excerpt, p.published, p.created_at, p.updated_at, u.name as author_name FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ${id}`;

		const post = posts[0];

		if (!post) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		// 댓글도 함께 조회
		const comments = await sql<
			{
				id: number;
				author_name: string;
				content: string;
				created_at: string;
			}[]
		>`SELECT id, author_name, content, created_at FROM comments WHERE post_id = ${post.id} ORDER BY created_at DESC`;

		return this.json({ data: { ...post, comments } });
	}

	// POST /api/posts — 포스트 생성
	async store({ body, response }: Context) {
		const data = body();

		// 필수 필드 검증
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

		const sql = await getDB();

		// 슬러그 중복 확인
		const existing = await sql<
			{ id: number }[]
		>`SELECT id FROM posts WHERE slug = ${slug}`;
		if (existing.length > 0) {
			return response.status(409).json({
				error: "Conflict",
				message: "이미 존재하는 슬러그입니다",
			});
		}

		await sql`INSERT INTO posts (title, slug, content, excerpt, author_id, published) VALUES (${data.title}, ${slug}, ${data.content ?? ""}, ${data.excerpt ?? ""}, ${Number(data.author_id) || 1}, ${Number(data.published) ?? 0})`;

		const [created] = await sql<
			{ id: number; title: string; slug: string }[]
		>`SELECT id, title, slug FROM posts WHERE slug = ${slug}`;

		return this.json({ data: created }, 201);
	}

	// PUT /api/posts/:id — 포스트 수정
	async update({ body, params, response }: Context) {
		const data = body();
		const id = Number(params.id);
		const sql = await getDB();

		// 존재 확인
		const existing = await sql<
			{ id: number }[]
		>`SELECT id FROM posts WHERE id = ${id}`;
		if (existing.length === 0) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		await sql`UPDATE posts SET title = ${data.title}, content = ${data.content ?? ""}, excerpt = ${data.excerpt ?? ""}, published = ${Number(data.published) ?? 0}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;

		const [updated] = await sql<
			{
				id: number;
				title: string;
				slug: string;
				published: number;
				updated_at: string;
			}[]
		>`SELECT id, title, slug, published, updated_at FROM posts WHERE id = ${id}`;

		return this.json({ data: updated });
	}

	// DELETE /api/posts/:id — 포스트 삭제
	async delete({ params, response }: Context) {
		const id = Number(params.id);
		const sql = await getDB();

		const existing = await sql<
			{ id: number }[]
		>`SELECT id FROM posts WHERE id = ${id}`;
		if (existing.length === 0) {
			return response.status(404).json({
				error: "Not Found",
				message: "포스트를 찾을 수 없습니다",
			});
		}

		await sql`DELETE FROM posts WHERE id = ${id}`;

		return this.json({ data: { deleted: true, id } });
	}
}

export default new ApiPostController();
