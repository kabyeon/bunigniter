# 🛤 Routing

Routes are defined in `app/config/routes.ts`. Supports both explicit routes and auto routing (CI3 compatible).

## Basic Routes

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

## Resource Routes

```typescript
router.resource("users", userController);
```

Creates 7 CRUD routes at once:

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/users` | `index` | List |
| GET | `/users/create` | `create` | Create form |
| POST | `/users` | `store` | Store |
| GET | `/users/:id` | `show` | Show |
| GET | `/users/:id/edit` | `edit` | Edit form |
| PUT | `/users/:id` | `update` | Update |
| DELETE | `/users/:id` | `delete` | Delete |

## Auto Routing (CI3 Compatible)

Same as CodeIgniter 3's Auto Routing. Automatically maps URLs to controllers/methods.

### Enabling

```typescript
// Enabled by default (defaults: enabled=true, defaultController="welcome")
router.autoRoute();

// Custom configuration
router.autoRoute({
  enabled: true,
  defaultController: "home",    // CI3: $route['default_controller']
  defaultMethod: "index",       // Default method
  exclude: ["api/auth"],        // Paths to exclude
  middleware: [csrfMiddleware], // Middleware to apply to auto-routed requests
});

// Disable
router.autoRoute({ enabled: false });
```

### How It Works

| URL | Mapping | Description |
|-----|---------|-------------|
| `/` | `WelcomeController::index()` | Default controller |
| `/posts` | `PostController::index()` | Default method |
| `/posts/show` | `PostController::show()` | Method specified |
| `/posts/show/5` | `PostController::show(5)` | Method + parameter |
| `/posts/edit/5/draft` | `PostController::edit(5, "draft")` | Multiple parameters |
| `/admin/users` | `admin/user_controller.ts` → `UserController::index()` | Subdirectory |

### Parameter Access

URL parameters passed via auto route can be accessed in two ways:

1. **`params.arg0`, `params.arg1` ...** — Access via `Context.params` object
2. **Additional arguments** — Passed sequentially starting from the second argument of the controller method

```typescript
// /posts/show/5/draft
async show(ctx: Context, id: string, status: string = "draft") {
  // ctx.params.arg0 === "5"
  // ctx.params.arg1 === "draft"
  // id === "5"
  // status === "draft"
}
```

> ⚠️ In explicit routes (`router.get("/posts/:id", ...)`) you access via `params.id`, but in auto routes only `params.arg0` style is available.

### File Naming Rules

Controller names from URLs are automatically converted to snake_case filenames:

| URL Controller | Filename | Class Name |
|---------------|----------|------------|
| `posts` | `post_controller.ts` | `PostController` |
| `users` | `user_controller.ts` | `UserController` |
| `post-categories` | `post_category_controller.ts` | `PostCategoryController` |
| `products` | `product_controller.ts` | `ProductController` |

Rules:

1. URL name → singular form (posts → post)
2. kebab-case → snake_case (post-categories → post_category)
3. Filename: `{singular_snake_case}_controller.ts`
4. Class name: `{PascalCase}Controller`

### Explicit Routes Take Priority

Auto routing and explicit routes can be used together. **Explicit routes always take priority**:

```typescript
const router = new Router();

// Enable auto routing
router.autoRoute();

// Explicit routes → take priority over auto routes
router.resource("posts", postController);  // /posts/* uses resource routes
router.get("/about", welcomeController, "about");  // /about uses explicit route

// /products, /orders etc. without explicit routes use auto routing
```

### Excluding Paths from Auto Route

You can exclude specific paths from auto routing:

```typescript
router.autoRoute({
  enabled: true,
  exclude: ["api/auth", "admin/settings"],  // These paths are excluded from auto routing
});
```

### Auto Route Middleware

You can set middleware that applies only to auto-routed requests:

```typescript
router.autoRoute({
  enabled: true,
  middleware: [csrfMiddleware],  // Apply CSRF only to auto-routed requests
});
```

### Subdirectory Support

Controllers in subdirectories under `app/controllers/` are also automatically mapped:

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

### CI3 ↔ BunIgniter Comparison

| CodeIgniter 3 | BunIgniter |
|---------------|------------|
| Enabled by default | `router.autoRoute()` |
| `$config['enable_query_strings']` | `router.autoRoute({ enabled: false })` |
| `$route['default_controller'] = 'welcome'` | `router.autoRoute({ defaultController: "welcome" })` |
| `/posts/show/5` → `Posts::show(5)` | `/posts/show/5` → `PostController::show(5)` |
| `application/controllers/admin/Users.php` | `app/controllers/admin/user_controller.ts` |
| Explicit routes take priority | Explicit routes take priority (same) |

---

## Applying Middleware

```typescript
import { authGuard } from "system/core/auth.ts";

// Middleware on resource routes
router.resource("admin", adminController, [authGuard]);

// Route groups (batch middleware)
router.group("/api", [authMiddleware], (router) => {
  router.resource("posts", postController);
});

// Global middleware
router.use(corsMiddleware);
```

## Route Model Binding

Automatically resolves route parameters to model instances:

```typescript
import { RouteModelBinding } from "system/core/route_model_binding.ts";
import userModel from "app/models/user_model.ts";

// Register binding
RouteModelBinding.bind("user", userModel);
RouteModelBinding.bind("post", postModel, "slug"); // resolve by slug field

// Define route
router.get("/users/:user", userController, "show");

// In controller, params.user is already a DB-resolved object
async show({ params }: Context) {
  const user = params.user; // Auto-resolved, returns 404 if not found
}
```

## Custom 404 Handler

Same as CI3's `$route['404_override']`:

```typescript
router.notFound(async ({ request, params }) => {
  return new Response(
    "<!DOCTYPE html><html><body><h1>404 - Page Not Found</h1></body></html>",
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
});
```

```typescript
export default router;
```
