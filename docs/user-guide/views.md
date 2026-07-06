# 🎨 뷰 & 템플릿

BunIgniter는 PHP/CI3 친화적 자체 템플릿 엔진을 내장합니다. 외부 의존성이 없으며, Bun native `AsyncFunction`으로 컴파일하여 고속 렌더링합니다.

## 템플릿 문법

### 변수 출력

```html
<!-- 이스케이프 출력 (XSS 방지, 권장) -->
<h1>{{ title }}</h1>
<p>{{ post.content }}</p>

<!-- 이스케이프 없이 raw 출력 -->
<div>{{{ rawHtml }}}</div>

<!-- PHP 단축태그 — raw 출력 -->
<p><?= name ?></p>

<!-- 명시적 이스케이프 (<?= + escapeHtml) -->
<?= escapeHtml(userInput) ?>
```

| 문법 | 이스케이프 | 용도 |
|------|-----------|------|
| `{{ expr }}` | ✅ 자동 | 일반 출력 (권장) |
| `{{{ expr }}}` | ❌ 없음 | HTML 포함 출력 |
| `<?= expr ?>` | ❌ 없음 | PHP 스타일 raw 출력 |
| `<?= escapeHtml(x) ?>` | ✅ 명시적 | 안전한 출력 |

### 기본값 (nullish coalescing)

```html
<!-- undefined 변수 → 기본값 사용 -->
<title>{{ title ?? "BunIgniter" }}</title>
<p>{{ post.excerpt ?? "요약 없음" }}</p>
```

### 제어문

```html
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

<!-- 제어문 + <?= 조합 -->
<? for (const post of posts) { ?>
  <article>
    <h2><?= post.title ?></h2>
    <p>{{ post.excerpt }}</p>
  </article>
<? } ?>
```

### include() — 다른 템플릿 포함

CI3의 `$this->load->view()` 와 동일합니다:

```html
<!-- 헤더 포함 -->
<? include('partials/header') ?>

<!-- 데이터 전달 -->
<? include('partials/post-card', { post }) ?>

<!-- 네비게이션 -->
<? include('partials/nav', { active: 'home' }) ?>
```

포함된 템플릿은 부모의 모든 데이터에 접근할 수 있으며, 추가 데이터도 전달할 수 있습니다.

---

## 뷰 호출

컨트롤러에서 `this.view()` 로 렌더링:

```typescript
// 기본
return this.view("posts/index", { posts, title: "목록" });

// 레이아웃 없이
return this.view("emails/welcome", { user });
```

---

## 레이아웃 시스템

### 기본 사용법

뷰 상단에 `<!-- layout:name -->` 주석을 추가하면 자동 적용됩니다.

**레이아웃** (`app/views/layout/default.html`):

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{{ slot:title || "BunIgniter" }}}</title>
</head>
<body>
  <nav>🔥 BunIgniter</nav>
  <main>{{{ content }}}</main>
</body>
</html>
```

**뷰** (`app/views/posts/index.html`):

```html
<!-- layout:default -->
<!-- slot:title -->포스트 목록<!-- endslot -->

<h1>포스트 목록</h1>
<? for (const post of posts) { ?>
  <div>{{ post.title }}</div>
<? } ?>
```

### 슬롯 시스템

레이아웃에 여러 슬롯을 정의하고, 자식 뷰에서 오버라이드할 수 있습니다.

**레이아웃 — 슬롯 정의:**

```html
<head>
  <title>{{{ slot:title || "BunIgniter" }}}</title>
  {{{ slot:head }}}
</head>
<body>
  <nav>{{{ slot:nav }}}</nav>
  <main>{{{ content }}}</main>
  {{{ slot:footer }}}
</body>
```

**자식 뷰 — 슬롯 채우기:**

```html
<!-- layout:default -->
<!-- slot:title -->내 블로그<!-- endslot -->
<!-- slot:head -->
<meta name="description" content="블로그 설명" />
<link rel="stylesheet" href="/css/blog.css" />
<!-- endslot -->

<h1>본문 내용</h1>
<p>이 내용은 {{{ content }}} 슬롯에 자동으로 들어갑니다.</p>
```

| 문법 | 설명 |
|------|------|
| `{{{ content }}}` | 기본 슬롯 — 본문 내용 자동 삽입 |
| `{{{ slot:name }}}` | 이름 슬롯 — 없으면 빈 문자열 |
| `{{{ slot:name \|\| "기본값" }}}` | 이름 슬롯 — 기본값 지원 |
| `<!-- slot:name -->...<!-- endslot -->` | 자식 뷰에서 슬롯 정의 |

### 여러 레이아웃

```html
<!-- layout:admin -->   → app/views/layout/admin.html
<!-- layout:email -->   → app/views/layout/email.html
<!-- layout:default --> → app/views/layout/default.html
```

`<!-- layout: -->` 주석이 없으면 레이아웃 없이 독립 렌더링됩니다.

---

## 파셜 (Partial) 뷰

재사용 가능한 파셜 컴포넌트를 `app/views/partials/` 디렉토리에 배치합니다:

**파셜** (`app/views/partials/post-card.html`):

```html
<article class="post-card">
  <h2><a href="/posts/{{ post.slug }}">{{ post.title }}</a></h2>
  <p>{{ post.excerpt }}</p>
</article>
```

**사용:**

```html
<? for (const post of posts) { ?>
  <? include('partials/post-card', { post }) ?>
<? } ?>
```

### 내장 파셜

BunIgniter는 기본 파셜을 `app/views/partials/` 에 제공합니다:

| 파셜 | 설명 | 사용 |
|------|------|------|
| `nav.html` | 네비게이션 바 (로그인/로그아웃) | `<? include('partials/nav') ?>` |
| `footer.html` | 푸터 (저작권) | `<? include('partials/footer') ?>` |
| `head.html` | HEAD 공통 메타 태그 + CSS | `<? include('partials/head') ?>` |
| `alerts.html` | Flash 알림 (success/error) | `<? include('partials/alerts') ?>` |

### 파셜 컨벤션

1. `app/views/partials/` 디렉토리에 배치
2. `<? include('partials/name') ?>` 로 포함
3. 데이터 전달: `<? include('partials/name', { data }) ?>`
4. 포함된 파셜은 부모의 모든 데이터에 접근 가능
5. 레이아웃에서 파셜 사용 가능: `<? include('partials/nav') ?>`

### 레이아웃 + 파셜 조합

```html
<!-- app/views/layout/default.html -->
<!doctype html>
<html lang="ko">
  <head>
    <? include('partials/head') ?>
    <title>{{{ slot:title || "BunIgniter" }}}}</title>
  </head>
  <body>
    <? include('partials/nav') ?>
    <main class="container">
      <? include('partials/alerts') ?>
      {{{ content }}}
    </main>
    <? include('partials/footer') ?>
    <script src="/js/app.js"></script>
  </body>
</html>
```

---

## 내장 함수

템플릿 내부에서 자동으로 사용 가능한 함수:

| 함수 | 설명 |
|------|------|
| `echo(chunk)` | 출력 버퍼에 추가 |
| `escapeHtml(s)` | HTML 특수문자 이스케이프 |
| `include(path, data?)` | 다른 템플릿 포함 |

---

## 캐시 동작

| 환경 | 동작 |
|------|------|
| `development` | 매 요청 재컴파일 (핫리로드) |
| `production` | 컴파일된 템플릿 캐시 |

---

## CI3 ↔ BunIgniter 대조표

| CodeIgniter 3 | BunIgniter |
|---------------|-----------|
| `$this->load->view('posts', $data)` | `this.view('posts/index', data)` |
| `<?php echo $title; ?>` | `{{ title }}` |
| `<?php echo htmlspecialchars($title); ?>` | `{{ title }}` (자동 `escapeHtml`) |
| `<?php echo $raw_html; ?>` | `<?= rawHtml ?>` 또는 `{{{ rawHtml }}}` |
| `<?php if (...): ?> ... <?php endif; ?>` | `<? if (...) { ?> ... <? } ?>` |
| `<?php foreach ($items as $item): ?>` | `<? for (const item of items) { ?>` |
| `$this->load->view('partials/header')` | `<? include('partials/header') ?>` |
| `$layout['title'] = '...'` | `<!-- slot:title -->...<!-- endslot -->` |
| `<?php echo $layout_content; ?>` | `{{{ content }}}` |
