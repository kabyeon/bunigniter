# 🧰 헬퍼 함수

`system/helpers/index.ts` 에서 제공합니다.

## URL

```typescript
import { siteUrl, baseUrl } from "system/helpers/index.ts";

siteUrl("posts/1");  // "http://localhost:3000/posts/1"
baseUrl();           // "http://localhost:3000"
```

## 문자열

```typescript
import { slug, truncate, escapeHtml } from "system/helpers/index.ts";

slug("Hello World");          // "hello-world"
truncate("Long text...", 10); // "Long text..."
escapeHtml("<b>bold</b>");    // "&lt;b&gt;bold&lt;/b&gt;"
```

## 날짜

```typescript
import { formatDate, timeAgo } from "system/helpers/index.ts";

formatDate(new Date(), "Y-m-d H:i:s"); // "2025-07-05 23:30:00"
timeAgo(new Date());                    // "방금 전", "5분 전", "2시간 전", "3일 전"
```

## 숫자 / 통화

```typescript
import { formatNumber, formatCurrency } from "system/helpers/index.ts";

formatNumber(1234567);    // "1,234,567"
formatCurrency(50000);    // "50,000원"
```

## Input 헬퍼

```typescript
import { Input } from "system/core/input.ts";

Input.post(request, "name");       // POST 데이터
Input.get(request, "page");        // GET 파라미터
Input.header(request, "auth");     // 헤더
Input.method(request);             // "GET", "POST"
Input.ip(request);                 // 클라이언트 IP
Input.userAgent(request);          // User Agent
Input.isAjax(request);             // AJAX 여부
Input.isJson(request);             // JSON 요청 여부
```
