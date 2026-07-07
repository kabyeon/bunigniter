# 🎮 Controllers

Extend the `Controller` class to create controllers.

## Basic Structure

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";

export class UserController extends Controller {
  async index({ query }: Context) { /* list */ }
  async show({ params, response }: Context) { /* detail */ }
  async create({}: Context) { /* create form */ }
  async store({ body, response }: Context) { /* save */ }
  async edit({ params }: Context) { /* edit form */ }
  async update({ body, params }: Context) { /* update */ }
  async delete({ params }: Context) { /* delete */ }
}

export default new UserController();
```

## Response Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `this.view(path, data)` | Render a view | `Promise<Response>` |
| `this.json(data, status?)` | JSON response | `Response` |
| `this.redirect(url)` | Redirect (302) | `Response` |

> ⚠️ **When using auto routing**: URL parameters are accessed via `params.arg0`, `params.arg1` ... Not the `params.id` format used in explicit routes. See the [Routing doc - Auto Route Parameters](./routing.md#parameter-access) for details.

## Context Interface

```typescript
interface Context {
  request: Request;                    // Web standard Request
  response: {
    status: (code: number) => any;
    redirect: (url: string) => Response;
    json: (data: any) => Response;
    send: (body: string | Response) => Response;
    headers: (headers: Record<string, string>) => any;
    cookie: (name: string, value: string, options?: any) => void;
  };
  params: Record<string, string>;      // URL parameters
  query: Record<string, string>;       // Query parameters
  body: () => any;                     // Parsed request body
}
```

> ⚠️ `request.body` is a Bun readonly property and cannot be used. Always use the `body()` function.

## Web Controller Example

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import postModel from "app/models/post_model.ts";

export class PostController extends Controller {
  // GET / — list posts
  async index({ query }: Context) {
    const page = Number(query.page ?? "1");
    const result = await postModel.paginate(page, 10);
    return this.view("posts/index", { ...result, title: "Blog" });
  }

  // GET /posts/:slug — post detail
  async show({ params, response }: Context) {
    const post = await postModel.findFirst({ slug: params.slug });
    if (!post) return response.status(404).send("Not Found");
    return this.view("posts/show", { post, title: post.title });
  }

  // POST /admin/posts — create post
  async store({ body }: Context) {
    const data = body();
    await postModel.create({
      title: data.title,
      slug: generateSlug(data.title),
      content: data.content,
      author_id: 1,
      published: Number(data.published) || 0,
    });
    return this.redirect("/admin/posts");
  }
}
```

## API Controller Example (QueryBuilder)

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { Model } from "system/core/model.ts";

class PostModel extends Model<any> {
  override tableName = "posts";
}
const postModel = new PostModel();

export class ApiPostController extends Controller {
  // GET /api/posts — pagination + JOIN
  async index({ query }: Context) {
    const result = await postModel.qb()
      .select("p.id, p.title, p.slug, p.excerpt, u.name as author_name")
      .from("posts p")
      .join("users u", "u.id = p.author_id")
      .where("p.published", 1)
      .orderBy("p.created_at", "DESC")
      .paginate(Number(query.page ?? "1"), 10);

    return this.json(result);
  }

  // GET /api/posts/:id — detail
  async show({ params, response }: Context) {
    const post = await postModel.qb()
      .select("p.*, u.name as author_name")
      .from("posts p")
      .join("users u", "u.id = p.author_id")
      .where("p.id", Number(params.id))
      .first();

    if (!post) return response.status(404).json({ error: "Not Found" });
    return this.json({ data: post });
  }

  // POST /api/posts — create
  async store({ body, response }: Context) {
    const data = body();
    if (!data.title) {
      return response.status(422).json({ error: "title is required" });
    }

    const exists = await postModel.exists({ slug: data.slug });
    if (exists) return response.status(409).json({ error: "Duplicate slug" });

    const created = await postModel.create(data);
    return this.json({ data: created }, 201);
  }

  // PUT /api/posts/:id — update
  async update({ body, params, response }: Context) {
    const existing = await postModel.findById(Number(params.id));
    if (!existing) return response.status(404).json({ error: "Not Found" });

    const updated = await postModel.update(Number(params.id), body());
    return this.json({ data: updated });
  }

  // DELETE /api/posts/:id — delete
  async delete({ params, response }: Context) {
    const deleted = await postModel.delete(Number(params.id));
    if (!deleted) return response.status(404).json({ error: "Not Found" });
    return this.json({ data: { deleted: true } });
  }
}
```

> 💡 For the full Query Builder API, see the [Query Builder documentation](./query-builder.md).
