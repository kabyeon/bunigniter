import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import postModel from "app/models/post_model.ts";

export class PostController extends Controller {
  // GET /posts
  async index({ request, response }: Context) {
    const posts = await postModel.findAll();
    return this.view("posts/index", { posts });
  }

  // GET /posts/:id
  async show({ request, params, response }: Context) {
    const post = await postModel.findById(Number(params.id));
    if (!post) return response.status(404).send("Not Found");
    return this.view("posts/show", { post });
  }

  // GET /posts/create
  async create({ request, response }: Context) {
    return this.view("posts/create");
  }

  // POST /posts
  async store({ request, response }: Context) {
    const data = request.body();
    await postModel.create(data);
    return response.redirect("/posts");
  }

  // GET /posts/:id/edit
  async edit({ request, params, response }: Context) {
    const post = await postModel.findById(Number(params.id));
    if (!post) return response.status(404).send("Not Found");
    return this.view("posts/edit", { post });
  }

  // PUT /posts/:id
  async update({ request, params, response }: Context) {
    const data = request.body();
    await postModel.update(Number(params.id), data);
    return response.redirect("/posts");
  }

  // DELETE /posts/:id
  async delete({ request, params, response }: Context) {
    await postModel.delete(Number(params.id));
    return response.redirect("/posts");
  }
}

export default new PostController();
