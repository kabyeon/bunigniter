# 🔗 라우트 모델 바인딩

라우트 파라미터를 자동으로 모델 인스턴스로 변환합니다.

## 바인딩 등록

```typescript
import { RouteModelBinding } from "system/core/route_model_binding.ts";
import userModel from "app/models/user_model.ts";
import postModel from "app/models/post_model.ts";

// ID로 조회 (기본)
RouteModelBinding.bind("user", userModel);

// 다른 필드로 조회
RouteModelBinding.bind("post", postModel, "slug");
```

## 라우트 정의

```typescript
// :user 파라미터가 자동으로 DB 조회됨
router.get("/users/:user", userController, "show");
router.get("/posts/:post", postController, "show");
```

## 컨트롤러

```typescript
async show({ params }: Context) {
  // params.user 가 이미 DB에서 조회된 객체
  const user = params.user;  // UserInterface 객체

  // 조회 실패 시 자동으로 404 응답
}
```

## API

| 메서드 | 설명 |
|--------|------|
| `RouteModelBinding.bind(param, model, field?)` | 바인딩 등록 |
| `RouteModelBinding.unbind(param)` | 바인딩 제거 |
| `RouteModelBinding.has(param)` | 바인딩 존재 여부 |
| `RouteModelBinding.getBindings()` | 등록된 바인딩 목록 |
| `RouteModelBinding.flush()` | 전체 바인딩 초기화 |
| `RouteModelBinding.resolve(params)` | 파라미터 자동 변환 (내부 사용) |
