# 🔐 Authentication (Auth)

Provides session-based authentication with bcrypt password hashing.

## Basic Usage

```typescript
import { Auth, authGuard, guestGuard } from "system/core/auth.ts";

// Attempt login
const result = await Auth.attempt(request, "alice@example.com", "password123");
if (result.success) console.log(result.user);

// Check status
Auth.check(request);         // boolean
Auth.user(request);          // AuthUser | null
Auth.id(request);            // number | null

// Login/Logout
await Auth.loginById(request, userId);
Auth.logout(request);
```

## Password Hashing

```typescript
const hash = await Auth.hashPassword("password123");
const valid = await Auth.verifyPassword("password123", hash); // true
```

## Middleware

```typescript
import { authGuard, guestGuard } from "system/core/auth.ts";

router.resource("admin", adminController, [authGuard]);      // Requires login
router.get("/login", loginController, "show", [guestGuard]); // Guests only
```

- `authGuard`: Unauthenticated users → redirect to `/login`
- `guestGuard`: Authenticated users → redirect to `/`
