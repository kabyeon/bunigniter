# 🎮 컨트롤러

`Controller` 클래스를 상속받아 작성합니다.

## 기본 구조

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";

export class UserController extends Controller {
  async index({ request, response }: Context) { /* 목록 */ }
  async show({ request, params, response }: Context) { /* 상세 */ }
  async create({ request, response }: Context) { /* 생성 폼 */ }
  async store({ request, response }: Context) { /* 저장 */ }
  async edit({ request, params, response }: Context) { /* 수정 폼 */ }
  async update({ request, params, response }: Context) { /* 수정 */ }
  async delete({ request, params, response }: Context) { /* 삭제 */ }
}

export default new UserController();
```

## 응답 메서드

| 메서드 | 설명 | 반환 |
|--------|------|------|
| `this.view(path, data)` | 뷰 렌더링 | `Promise<Response>` |
| `this.json(data, status?)` | JSON 응답 | `Response` |
| `this.redirect(url)` | 리다이렉트 (302) | `Response` |

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
  body: () => any;                     // 요청 본문
}
```

## 사용 예시

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import userModel from "app/models/user_model.ts";
import { validate } from "system/core/validator.ts";

export class UserController extends Controller {
  async index({ request, response }: Context) {
    const users = await userModel.findAll();
    return this.view("users/index", { users });
  }

  async store({ request, response }: Context) {
    const data = request.body();
    const { valid, errors } = validate(data, {
      name: "required|min:2",
      email: "required|email",
    });
    if (!valid) return this.json({ errors }, 422);
    await userModel.create(data);
    return response.redirect("/users");
  }

  async apiList({ request, response }: Context) {
    const users = await userModel.findAll();
    return this.json(users);
  }
}

export default new UserController();
```
