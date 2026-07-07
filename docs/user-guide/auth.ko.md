# 🔐 인증 (Auth)

세션 기반 인증 + bcrypt 패스워드 해싱을 제공합니다.

## 기본 사용법

```typescript
import { Auth, authGuard, guestGuard } from "system/core/auth.ts";

// 로그인 시도
const result = await Auth.attempt(request, "alice@example.com", "password123");
if (result.success) console.log(result.user);

// 상태 확인
Auth.check(request);         // boolean
Auth.user(request);          // AuthUser | null
Auth.id(request);            // number | null

// 로그인/로그아웃
await Auth.loginById(request, userId);
Auth.logout(request);
```

## 비밀번호 해싱

```typescript
const hash = await Auth.hashPassword("password123");
const valid = await Auth.verifyPassword("password123", hash); // true
```

## 미들웨어

```typescript
import { authGuard, guestGuard } from "system/core/auth.ts";

router.resource("admin", adminController, [authGuard]);      // 로그인 필요
router.get("/login", loginController, "show", [guestGuard]); // 게스트 전용
```

- `authGuard`: 로그인하지 않은 사용자 → `/login` 리다이렉트
- `guestGuard`: 로그인한 사용자 → `/` 리다이렉트
