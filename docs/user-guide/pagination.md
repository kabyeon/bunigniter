# 📄 Pagination

## Controller

```typescript
async index({ request, response }: Context) {
  const page = Number(request.query.page ?? 1);
  const result = await postModel.paginate(page, 15);
  return this.view("posts/index", { posts: result.data, pagination: result });
}
```

## View (HTML)

```html
<?= paginationHtml(pagination) ?>
```

## API (JSON)

```typescript
import { paginationMeta } from "system/core/pagination.ts";

return this.json({
  data: result.data,
  meta: paginationMeta(result),
});
```

## Utilities

| Function | Description |
|----------|-------------|
| `paginationHtml(pagination)` | HTML navigation (`<nav class="pagination">...`) |
| `paginationInfo(pagination)` | Info text ("Showing 1-15 of 150 items") |
| `paginationMeta(pagination)` | API metadata (`{ current_page, total, ... }`) |
