# 🔒 CSRF 보호

Double Submit Cookie 방식의 CSRF 보호 미들웨어입니다.

## 설정

```typescript
// app/config/app.ts
csrf: {
  enabled: true,
  tokenName: "csrf_token",
  cookieName: "csrf_token",
}
```

## 사용법

### 1. 라우트에 미들웨어 적용

```typescript
import { csrfMiddleware } from "system/core/csrf.ts";
router.post("/form", controller, "store", [csrfMiddleware]);
```

### 2. 폼에 hidden 필드

```html
<form method="POST" action="/posts">
  <?= csrfField(csrfToken) ?>
  <!-- 폼 필드... -->
</form>
```

### 3. AJAX 요청

```html
<head><?= csrfMeta(csrfToken) ?></head>
```

```javascript
fetch("/api/posts", {
  method: "POST",
  headers: {
    "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
  },
  body: JSON.stringify(data),
});
```

## 동작 방식

1. **GET**: 쿠키에 CSRF 토큰 설정 (JavaScript에서 읽을 수 있음)
2. **POST/PUT/PATCH/DELETE**: 쿠키 토큰 == 요청 토큰 검증
3. 토큰 불일치 시 403 응답
4. GET/HEAD/OPTIONS 요청은 검증 제외

토큰 전달 방법 (우선순위): 본문 필드 → 폼 데이터 → `X-CSRF-Token` 헤더 → 쿼리 파라미터
