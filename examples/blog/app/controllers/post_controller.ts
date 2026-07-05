import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { getDB } from "system/core/database.ts";

/** 허용된 리다이렉트 경로인지 검증 (오픈 리다이렉트 방지) */
function safeRedirect(url: string): string {
	if (url.startsWith("/") && !url.startsWith("//")) return url;
	return "/";
}

/** 검증된 경로로 302 리다이렉트 응답 생성 */
function redirect(url: string): Response {
	return new Response(null, {
		status: 302,
		headers: { Location: safeRedirect(url) },
	});
}

export class PostController extends Controller {
	// GET / — 공개 포스트 목록
	async index({ query }: Context) {
		const page = Number(query.page ?? "1");
		const perPage = 5;

		const sql = await getDB();
		const total =
			await sql`SELECT COUNT(*) as count FROM posts WHERE published = 1`;
		const count = (total[0] as any).count;
		const totalPages = Math.ceil(count / perPage);
		const offset = (page - 1) * perPage;

		const posts =
			await sql`SELECT p.*, u.name as author_name FROM posts p JOIN users u ON p.author_id = u.id WHERE p.published = 1 ORDER BY p.created_at DESC LIMIT ${perPage} OFFSET ${offset}`;

		return this.view("posts/index", {
			title: "블로그",
			posts,
			page,
			totalPages,
			count,
		});
	}

	// GET /posts/:slug — 포스트 상세
	async show({ params, response }: Context) {
		const sql = await getDB();
		const posts =
			await sql`SELECT p.*, u.name as author_name FROM posts p JOIN users u ON p.author_id = u.id WHERE p.slug = ${params.slug}`;
		const post = posts[0] as any;

		if (!post) return response.status(404).send("포스트를 찾을 수 없습니다");

		const comments =
			await sql`SELECT * FROM comments WHERE post_id = ${post.id} ORDER BY created_at DESC`;

		return this.view("posts/show", {
			title: post.title,
			post,
			comments,
		});
	}

	// GET /admin/posts — 관리 포스트 목록
	async admin({}: Context) {
		const sql = await getDB();
		const posts =
			await sql`SELECT p.*, u.name as author_name FROM posts p JOIN users u ON p.author_id = u.id ORDER BY p.created_at DESC`;

		return this.view("posts/admin", {
			title: "포스트 관리",
			posts,
		});
	}

	// GET /admin/posts/create
	async create({}: Context) {
		return this.view("posts/create", {
			title: "새 포스트 작성",
		});
	}

	// POST /admin/posts
	async store({ body }: Context) {
		const data = body();
		const slug = data.title
			.toLowerCase()
			.replace(/[^a-z0-9가-힣\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");

		const sql = await getDB();
		await sql`INSERT INTO posts (title, slug, content, excerpt, author_id, published) VALUES (${data.title}, ${slug}, ${data.content ?? ""}, ${data.excerpt ?? ""}, ${Number(data.author_id) || 1}, ${Number(data.published) || 0})`;

		return redirect("/admin/posts");
	}

	// GET /admin/posts/:id/edit
	async edit({ params, response }: Context) {
		const sql = await getDB();
		const posts =
			await sql`SELECT * FROM posts WHERE id = ${Number(params.id)}`;
		const post = posts[0] as any;

		if (!post) return response.status(404).send("포스트를 찾을 수 없습니다");

		return this.view("posts/edit", {
			title: "포스트 수정",
			post,
		});
	}

	// PUT /admin/posts/:id
	async update({ body, params }: Context) {
		const data = body();
		const sql = await getDB();

		await sql`UPDATE posts SET title = ${data.title}, content = ${data.content ?? ""}, excerpt = ${data.excerpt ?? ""}, published = ${Number(data.published) || 0}, updated_at = CURRENT_TIMESTAMP WHERE id = ${Number(params.id)}`;

		return redirect("/admin/posts");
	}

	// DELETE /admin/posts/:id
	async delete({ params }: Context) {
		const sql = await getDB();
		await sql`DELETE FROM posts WHERE id = ${Number(params.id)}`;
		return redirect("/admin/posts");
	}
}

export default new PostController();
