import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import postModel from "app/models/post_model.ts";

/** 허용된 리다이렉트 경로인지 검증 (오픈 리다이렉트 방지) */
function safeRedirect(url: string): string {
	if (url.startsWith("/") && !url.startsWith("//")) return url;
	return "/";
}

/** 검증된 경로로 302 리다이렉트 응답 생성 */
function redirect(url: string): Response {
	return new Response(null, { status: 302, headers: { Location: safeRedirect(url) } });
}

export class PostController extends Controller {
  // GET /posts
  async index({}: Context) {
    const posts = await postModel.findAll();
    return this.view("posts/index", { posts });
  }

  // GET /posts/:id
  async show({ params, response }: Context) {
    const post = await postModel.findById(Number(params.id));
    if (!post) return response.status(404).send("Not Found");
    return this.view("posts/show", { post });
  }

  // GET /posts/create
  async create({}: Context) {
    return this.view("posts/create");
  }

  // POST /posts
  async store({ body }: Context) {
    const data = body();
    await postModel.create(data);
    return redirect("/posts");
  }

  // GET /posts/:id/edit
  async edit({ params, response }: Context) {
    const post = await postModel.findById(Number(params.id));
    if (!post) return response.status(404).send("Not Found");
    return this.view("posts/edit", { post });
  }

  // PUT /posts/:id
  async update({ body, params }: Context) {
    const data = body();
    await postModel.update(Number(params.id), data);
    return redirect("/posts");
  }

  // DELETE /posts/:id
  async delete({ params }: Context) {
    await postModel.delete(Number(params.id));
    return redirect("/posts");
  }
}

export default new PostController();
