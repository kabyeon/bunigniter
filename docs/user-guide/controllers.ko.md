# 🎮 컨트롤러

`Controller` 클래스를 상속받아 작성합니다.

## 기본 구조

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";

export class UserController extends Controller {
  async index({ query }: Context) { /* 목록 */ }
  async show({ params, response }: Context) { /* 상세 */ }
  async create({}: Context) { /* 생성 폼 */ }
  async store({ body, response }: Context) { /* 저장 */ }
  async edit({ params }: Context) { /* 수정 폼 */ }
  async update({ body, params }: Context) { /* 수정 */ }
  async delete({ params }: Context) { /* 삭제 */ }
}

export default new UserController();
```

## 응답 메서드

| 메서드 | 설명 | 반환 |
|--------|------|------|
| `this.view(path, data)` | 뷰 렌더링 | `Promise<Response>` |
| `this.json(data, status?)` | JSON 응답 | `Response` |
| `this.redirect(url)` | 리다이렉트 (302) | `Response` |

> ⚠️ **오토 라우트 사용 시**: URL 파라미터는 `params.arg0`, `params.arg1` ... 으로 접근합니다. 명시적 라우트처럼 `params.id` 형식이 아닙니다. 자세한 내용은 [라우팅 문서 - 오토 라우트 파라미터](./routing.ko.md#파라미터-접근)를 참조하세요.

## Context 인터페이스

```typescript
interface Context {
  request: Request;                    // 웹 표준 Request
  response: {
    status: (code: number) => any;
    redirect: (url: string) => Response;
    json: (data: any) => Response;
    send: (body: string | Response) => Response;
    headers: (headers: Record<string, string>) => any;
    cookie: (name: string, value: string, options?: any) => void;
  };
  params: Record<string, string>;      // URL 파라미터
  query: Record<string, string>;       // 쿼리 파라미터
  body: () => any;                     // 파싱된 요청 본문
}
```

> ⚠️ `request.body`는 Bun의 readonly 속성이므로 사용할 수 없습니다. 항상 `body()` 함수를 사용하세요.

## 웹 컨트롤러 예시

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import postModel from "app/models/post_model.ts";

export class PostController extends Controller {
  // GET / — 포스트 목록
  async index({ query }: Context) {
    const page = Number(query.page ?? "1");
    const result = await postModel.paginate(page, 10);
    return this.view("posts/index", { ...result, title: "블로그" });
  }

  // GET /posts/:slug — 포스트 상세
  async show({ params, response }: Context) {
    const post = await postModel.findFirst({ slug: params.slug });
    if (!post) return response.status(404).send("Not Found");
    return this.view("posts/show", { post, title: post.title });
  }

  // POST /admin/posts — 포스트 생성
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

## API 컨트롤러 예시 (QueryBuilder)

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { Model } from "system/core/model.ts";

class PostModel extends Model<any> {
  override tableName = "posts";
}
const postModel = new PostModel();

export class ApiPostController extends Controller {
  // GET /api/posts — 페이지네이션 + JOIN
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

  // GET /api/posts/:id — 상세 조회
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

  // POST /api/posts — 생성
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

  // PUT /api/posts/:id — 수정
  async update({ body, params, response }: Context) {
    const existing = await postModel.findById(Number(params.id));
    if (!existing) return response.status(404).json({ error: "Not Found" });

    const updated = await postModel.update(Number(params.id), body());
    return this.json({ data: updated });
  }

  // DELETE /api/posts/:id — 삭제
  async delete({ params, response }: Context) {
    const deleted = await postModel.delete(Number(params.id));
    if (!deleted) return response.status(404).json({ error: "Not Found" });
    return this.json({ data: { deleted: true } });
  }
}
```

> 💡 Query Builder의 전체 기능은 [Query Builder 문서](./query-builder.ko.md)를 참조하세요.
