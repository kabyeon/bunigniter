# 📄 페이지네이션

## 컨트롤러

```typescript
async index({ request, response }: Context) {
  const page = Number(request.query.page ?? 1);
  const result = await postModel.paginate(page, 15);
  return this.view("posts/index", { posts: result.data, pagination: result });
}
```

## 뷰 (HTML)

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

## 유틸리티

| 함수 | 설명 |
|------|------|
| `paginationHtml(pagination)` | HTML 네비게이션 (`<nav class="pagination">...`) |
| `paginationInfo(pagination)` | 정보 텍스트 ("총 150건 중 1-15건") |
| `paginationMeta(pagination)` | API 메타데이터 (`{ current_page, total, ... }`) |
