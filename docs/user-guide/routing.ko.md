# 🛤 라우팅

`app/config/routes.ts` 에서 라우트를 정의합니다. 명시적 라우트와 오토 라우트(CI3 호환)를 모두 지원합니다.

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

## 오토 라우트 (CI3 호환)

CodeIgniter 3의 Auto Routing과 동일합니다. URL만으로 자동으로 컨트롤러/메서드를 매핑합니다.

### 활성화

```typescript
// 기본 활성화 (기본값: enabled=true, defaultController="welcome")
router.autoRoute();

// 커스텀 설정
router.autoRoute({
  enabled: true,
  defaultController: "home",    // CI3: $route['default_controller']
  defaultMethod: "index",       // 기본 메서드
  exclude: ["api/auth"],        // 제외할 경로
  middleware: [csrfMiddleware], // 오토 라우트에 적용할 미들웨어
});

// 비활성화
router.autoRoute({ enabled: false });
```

### 동작 방식

| URL | 매핑 | 설명 |
|-----|------|------|
| `/` | `WelcomeController::index()` | 기본 컨트롤러 |
| `/posts` | `PostController::index()` | 기본 메서드 |
| `/posts/show` | `PostController::show()` | 메서드 지정 |
| `/posts/show/5` | `PostController::show(5)` | 메서드 + 파라미터 |
| `/posts/edit/5/draft` | `PostController::edit(5, "draft")` | 다중 파라미터 |
| `/admin/users` | `admin/user_controller.ts` → `UserController::index()` | 서브디렉토리 |

### 파라미터 접근

오토 라우트로 전달된 URL 파라미터는 컨트롤러 메서드에서 두 가지 방식으로 접근할 수 있습니다:

1. **`params.arg0`, `params.arg1` ...** — `Context.params` 객체를 통한 접근
2. **추가 인자** — 컨트롤러 메서드의 두 번째 인자부터 순서대로 전달

```typescript
// /posts/show/5/draft
async show(ctx: Context, id: string, status: string = "draft") {
  // ctx.params.arg0 === "5"
  // ctx.params.arg1 === "draft"
  // id === "5"
  // status === "draft"
}
```

> ⚠️ 명시적 라우트(`router.get("/posts/:id", ...)`)에서는 `params.id`로 접근하지만, 오토 라우트에서는 `params.arg0` 방식만 사용합니다.

### 파일명 매핑 규칙

URL의 컨트롤러 이름은 snake_case 파일명으로 자동 변환됩니다:

| URL 컨트롤러 | 파일명 | 클래스명 |
|-------------|--------|---------|
| `posts` | `post_controller.ts` | `PostController` |
| `users` | `user_controller.ts` | `UserController` |
| `post-categories` | `post_category_controller.ts` | `PostCategoryController` |
| `products` | `product_controller.ts` | `ProductController` |

규칙:

1. URL 이름 → 단수형 변환 (posts → post)
2. kebab-case → snake_case (post-categories → post_category)
3. 파일명: `{단수형_snake_case}_controller.ts`
4. 클래스명: `{PascalCase}Controller`

### 명시적 라우트가 우선

오토 라우트와 명시적 라우트를 함께 사용할 수 있습니다. **명시적 라우트가 항상 우선**입니다:

```typescript
const router = new Router();

// 오토 라우트 활성화
router.autoRoute();

// 명시적 라우트 → 오토 라우트보다 우선
router.resource("posts", postController);  // /posts/* 는 리소스 라우트 사용
router.get("/about", welcomeController, "about");  // /about 은 명시적 라우트

// /products, /orders 등 명시적 라우트가 없으면 오토 라우트 사용
```

### 오토 라우트 제외

특정 경로를 오토 라우트에서 제외할 수 있습니다:

```typescript
router.autoRoute({
  enabled: true,
  exclude: ["api/auth", "admin/settings"],  // 이 경로는 오토 라우트 제외
});
```

### 오토 라우트 미들웨어

오토 라우트에만 적용할 미들웨어를 설정할 수 있습니다:

```typescript
router.autoRoute({
  enabled: true,
  middleware: [csrfMiddleware],  // 오토 라우트된 요청에만 CSRF 적용
});
```

### 서브디렉토리 지원

`app/controllers/` 하위 디렉토리의 컨트롤러도 자동 매핑됩니다:

```
app/controllers/
├── welcome_controller.ts      → /welcome
├── post_controller.ts         → /posts
├── admin/
│   ├── user_controller.ts     → /admin/users
│   └── setting_controller.ts  → /admin/settings
└── api/
    └── auth_controller.ts     → /api/auth
```

### CI3 ↔ BunIgniter 대조표

| CodeIgniter 3 | BunIgniter |
|---------------|-----------|
| 기본 활성화 | `router.autoRoute()` |
| `$config['enable_query_strings']` | `router.autoRoute({ enabled: false })` |
| `$route['default_controller'] = 'welcome'` | `router.autoRoute({ defaultController: "welcome" })` |
| `/posts/show/5` → `Posts::show(5)` | `/posts/show/5` → `PostController::show(5)` |
| `application/controllers/admin/Users.php` | `app/controllers/admin/user_controller.ts` |
| 명시적 라우트 우선 | 명시적 라우트 우선 (동일) |

---

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

## 404 커스텀 핸들러

CI3의 `$route['404_override']` 와 동일합니다:

```typescript
router.notFound(async ({ request, params }) => {
  return new Response(
    "<!DOCTYPE html><html><body><h1>404 - 페이지를 찾을 수 없습니다</h1></body></html>",
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
});
```

export default router;
