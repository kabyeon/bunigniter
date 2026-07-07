# 🔗 Route Model Binding

Automatically resolves route parameters into model instances.

## Registering Bindings

```typescript
import { RouteModelBinding } from "system/core/route_model_binding.ts";
import userModel from "app/models/user_model.ts";
import postModel from "app/models/post_model.ts";

// Lookup by ID (default)
RouteModelBinding.bind("user", userModel);

// Lookup by a different field
RouteModelBinding.bind("post", postModel, "slug");
```

## Route Definition

```typescript
// :user parameter is auto-resolved from the database
router.get("/users/:user", userController, "show");
router.get("/posts/:post", postController, "show");
```

## Controller

```typescript
async show({ params }: Context) {
  // params.user is already a DB-fetched object
  const user = params.user;  // UserInterface object

  // Automatically returns a 404 response if not found
}
```

## API

| Method | Description |
|--------|-------------|
| `RouteModelBinding.bind(param, model, field?)` | Register a binding |
| `RouteModelBinding.unbind(param)` | Remove a binding |
| `RouteModelBinding.has(param)` | Check if binding exists |
| `RouteModelBinding.getBindings()` | List all registered bindings |
| `RouteModelBinding.flush()` | Clear all bindings |
| `RouteModelBinding.resolve(params)` | Auto-transform parameters (internal use) |
