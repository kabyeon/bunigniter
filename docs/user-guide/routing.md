# 🛤 라우팅

`app/config/routes.ts` 에서 라우트를 정의합니다.

## 기본 라우트

```typescript
import { Router } from "system/core/router.ts";
import welcomeController from "app/controllers/welcome_controller.ts";

const router = new Router();

router.get("/", welcomeController, "index");
router.post("/users", userController, "store");
router.put("/users/:id", userController, "update");
router.delete("/users/:id", userController, "delete");
router.patch("/users/:id", userController, "partialUpdate");
```

## 리소스 라우트

```typescript
router.resource("users", userController);
```

한 번에 7개 CRUD 라우트 생성:

| Method | Path | Method | 설명 |
|--------|------|--------|------|
| GET | `/users` | `index` | 목록 |
| GET | `/users/create` | `create` | 생성 폼 |
| POST | `/users` | `store` | 저장 |
| GET | `/users/:id` | `show` | 상세 |
| GET | `/users/:id/edit` | `edit` | 수정 폼 |
| PUT | `/users/:id` | `update` | 수정 |
| DELETE | `/users/:id` | `delete` | 삭제 |

## 미들웨어 적용

```typescript
import { authGuard } from "system/core/auth.ts";

// 리소스에 미들웨어
router.resource("admin", adminController, [authGuard]);

// 라우트 그룹 (미들웨어 일괄 적용)
router.group("/api", [authMiddleware], (router) => {
  router.resource("posts", postController);
});

// 글로벌 미들웨어
router.use(corsMiddleware);
```

## 라우트 모델 바인딩

라우트 파라미터를 자동으로 모델 인스턴스로 변환합니다:

```typescript
import { RouteModelBinding } from "system/core/route_model_binding.ts";
import userModel from "app/models/user_model.ts";

// 바인딩 등록
RouteModelBinding.bind("user", userModel);
RouteModelBinding.bind("post", postModel, "slug"); // slug 필드로 조회

// 라우트 정의
router.get("/users/:user", userController, "show");

// 컨트롤러에서 params.user 가 이미 DB 조회된 객체
async show({ params }: Context) {
  const user = params.user; // 자동 조회됨, 없으면 404
}
```

export default router;
