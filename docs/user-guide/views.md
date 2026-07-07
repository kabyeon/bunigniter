# 🎨 Views & Templates

BunIgniter includes a PHP/CI3-friendly built-in template engine. No external dependencies. Compiles to Bun native `AsyncFunction` for fast rendering.

## Template Syntax

### Variable Output

```html
<!-- Escaped output (XSS protection, recommended) -->
<h1>{{ title }}</h1>
<p>{{ post.content }}</p>

<!-- Raw output without escaping -->
<div>{{{ rawHtml }}}</div>

<!-- PHP short tag — raw output -->
<p><?= name ?></p>

<!-- Explicit escaping (<?= + escapeHtml) -->
<?= escapeHtml(userInput) ?>
```

| Syntax | Escaped | Usage |
|--------|---------|-------|
| `{{ expr }}` | ✅ Auto | General output (recommended) |
| `{{{ expr }}}` | ❌ No | HTML content output |
| `<?= expr ?>` | ❌ No | PHP-style raw output |
| `<?= escapeHtml(x) ?>` | ✅ Explicit | Safe output |

### Default Values (nullish coalescing)

```html
<!-- undefined variable → use default value -->
<title>{{ title ?? "BunIgniter" }}</title>
<p>{{ post.excerpt ?? "No summary" }}</p>
```

### Control Flow

```html
<!-- Conditionals -->
<? if (items.length > 0) { ?>
  <p>Items available</p>
<? } else { ?>
  <p>No items</p>
<? } ?>

<!-- Loops -->
<? for (const item of items) { ?>
  <li>{{ item.name }}</li>
<? } ?>

<!-- Control flow + <?= combination -->
<? for (const post of posts) { ?>
  <article>
    <h2><?= post.title ?></h2>
    <p>{{ post.excerpt }}</p>
  </article>
<? } ?>
```

### include() — Including Other Templates

Same as CI3's `$this->load->view()`:

```html
<!-- Include header -->
<? include('partials/header') ?>

<!-- Pass data -->
<? include('partials/post-card', { post }) ?>

<!-- Navigation -->
<? include('partials/nav', { active: 'home' }) ?>
```

Included templates have access to all parent data and can receive additional data.

---

## Calling Views

Render from a controller with `this.view()`:

```typescript
// Basic
return this.view("posts/index", { posts, title: "List" });

// Without layout
return this.view("emails/welcome", { user });
```

---

## Layout System

### Basic Usage

Add a `<!-- layout:name -->` comment at the top of your view to auto-apply a layout.

**Layout** (`app/views/layout/default.html`):

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

**View** (`app/views/posts/index.html`):

```html
<!-- layout:default -->
<!-- slot:title -->Post List<!-- endslot -->

<h1>Post List</h1>
<? for (const post of posts) { ?>
  <div>{{ post.title }}</div>
<? } ?>
```

### Slot System

Define multiple slots in the layout and override them from child views.

**Layout — Defining Slots:**

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

**Child View — Filling Slots:**

```html
<!-- layout:default -->
<!-- slot:title -->My Blog<!-- endslot -->
<!-- slot:head -->
<meta name="description" content="Blog description" />
<link rel="stylesheet" href="/css/blog.css" />
<!-- endslot -->

<h1>Body Content</h1>
<p>This content is automatically placed in the {{{ content }}} slot.</p>
```

| Syntax | Description |
|--------|-------------|
| `{{{ content }}}` | Default slot — body content auto-inserted |
| `{{{ slot:name }}}` | Named slot — empty string if not set |
| `{{{ slot:name \|\| "default" }}}` | Named slot — supports default value |
| `<!-- slot:name -->...<!-- endslot -->` | Define slot content in child view |

### Multiple Layouts

```html
<!-- layout:admin -->   → app/views/layout/admin.html
<!-- layout:email -->   → app/views/layout/email.html
<!-- layout:default --> → app/views/layout/default.html
```

Without a `<!-- layout: -->` comment, the view renders independently with no layout.

---

## Partial Views

Place reusable partial components in `app/views/partials/`:

**Partial** (`app/views/partials/post-card.html`):

```html
<article class="post-card">
  <h2><a href="/posts/{{ post.slug }}">{{ post.title }}</a></h2>
  <p>{{ post.excerpt }}</p>
</article>
```

**Usage:**

```html
<? for (const post of posts) { ?>
  <? include('partials/post-card', { post }) ?>
<? } ?>
```

### Built-in Partials

BunIgniter provides default partials in `app/views/partials/`:

| Partial | Description | Usage |
|---------|-------------|-------|
| `nav.html` | Navigation bar (login/logout) | `<? include('partials/nav') ?>` |
| `footer.html` | Footer (copyright) | `<? include('partials/footer') ?>` |
| `head.html` | HEAD common meta tags + CSS | `<? include('partials/head') ?>` |
| `alerts.html` | Flash alerts (success/error) | `<? include('partials/alerts') ?>` |

### Partial Conventions

1. Place in `app/views/partials/` directory
2. Include with `<? include('partials/name') ?>`
3. Pass data: `<? include('partials/name', { data }) ?>`
4. Included partials have access to all parent data
5. Can use partials in layouts: `<? include('partials/nav') ?>`

### Layout + Partial Combination

```html
<!-- app/views/layout/default.html -->
<!doctype html>
<html lang="en">
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

## Built-in Functions

Functions automatically available inside templates:

| Function | Description |
|----------|-------------|
| `echo(chunk)` | Add to output buffer |
| `escapeHtml(s)` | Escape HTML special characters |
| `include(path, data?)` | Include another template |

---

## Caching Behavior

| Environment | Behavior |
|-------------|----------|
| `development` | Recompile on every request (hot reload) |
| `production` | Cache compiled templates |

---

## CI3 ↔ BunIgniter Comparison

| CodeIgniter 3 | BunIgniter |
|---------------|------------|
| `$this->load->view('posts', $data)` | `this.view('posts/index', data)` |
| `<?php echo $title; ?>` | `{{ title }}` |
| `<?php echo htmlspecialchars($title); ?>` | `{{ title }}` (auto `escapeHtml`) |
| `<?php echo $raw_html; ?>` | `<?= rawHtml ?>` or `{{{ rawHtml }}}` |
| `<?php if (...): ?> ... <?php endif; ?>` | `<? if (...) { ?> ... <? } ?>` |
| `<?php foreach ($items as $item): ?>` | `<? for (const item of items) { ?>` |
| `$this->load->view('partials/header')` | `<? include('partials/header') ?>` |
| `$layout['title'] = '...'` | `<!-- slot:title -->...<!-- endslot -->` |
| `<?php echo $layout_content; ?>` | `{{{ content }}}` |
