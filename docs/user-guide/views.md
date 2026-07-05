# 🎨 뷰 & 레이아웃

## Rendu 템플릿 문법

```html
<!-- 변수 출력 (HTML 이스케이프) -->
<h1>{{ title }}</h1>

<!-- 변수 출력 (이스케이프 없음) -->
<div>{{{ rawHtml }}}</div>

<!-- 짧은 출력 -->
<p><?= name ?></p>

<!-- 조건문 -->
<? if (items.length > 0) { ?>
  <p>항목이 있습니다</p>
<? } else { ?>
  <p>항목이 없습니다</p>
<? } ?>

<!-- 반복문 -->
<? for (const item of items) { ?>
  <li>{{ item.name }}</li>
<? } ?>

<!-- 서버 사이드 스크립트 -->
<script server>
  const currentTime = new Date().toISOString();
</script>
```

## 뷰 호출

```typescript
return this.view("posts/index", { posts, title: "목록" });
return this.view("users/show", { user });
```

## 레이아웃 시스템

뷰 상단에 `<!-- layout:name -->` 주석을 추가하면 자동 적용:

**레이아웃** (`app/views/layout/default.html`):

```html
<!DOCTYPE html>
<html>
<head><title>{{ title ?? "BunIgniter" }}</title></head>
<body>
  <nav>🔥 BunIgniter</nav>
  <main>{{{ content }}}</main>     <!-- ← 뷰 내용 삽입 -->
</body>
</html>
```

**뷰** (`app/views/posts/index.html`):

```html
<!-- layout:default -->
<h1>게시글 목록</h1>
```

주석이 없으면 레이아웃 없이 독립 렌더링됩니다.

여러 레이아웃: `<!-- layout:admin -->`, `<!-- layout:email -->` 등
