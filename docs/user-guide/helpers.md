# 🧰 헬퍼 함수

9개 카테고리로 분리된 헬퍼 함수를 제공합니다. CI3 스타일로 파일별로 분리되어 있으며, `system/helpers/index.ts` 에서 전체 재export합니다.

## URL 헬퍼

```typescript
import { siteUrl, baseUrl, redirect, currentUrl } from "system/helpers/index.ts";

siteUrl("posts/1");  // "http://localhost:3000/posts/1"
baseUrl();           // "http://localhost:3000"
currentUrl(request); // 현재 요청 URL
redirect("/login");  // 리다이렉트 Response
```

## 문자열 헬퍼

```typescript
import { slug, truncate, escapeHtml, unescapeHtml, camelize, pascalize, snakeCase, kebabCase, ucwords, randomString, reduceMultiples, stripQuotes } from "system/helpers/index.ts";

slug("Hello World");          // "hello-world"
truncate("Long text...", 10); // "Long text..."
escapeHtml("<b>bold</b>");    // "&lt;b&gt;bold&lt;/b&gt;"
unescapeHtml("&lt;b&gt;");    // "<b>"
camelize("hello_world");      // "helloWorld"
pascalize("hello_world");     // "HelloWorld"
snakeCase("HelloWorld");      // "hello_world"
kebabCase("HelloWorld");      // "hello-world"
ucwords("hello world");       // "Hello World"
randomString(16);             // "a3f8b2c1d4e5f6g7"
reduceMultiples("a,,,b", ","); // "a,b"
stripQuotes("'hello'");       // "hello"
```

## 날짜 헬퍼

```typescript
import { formatDate, timeAgo, now, nowFormatted, daysBetween, isValidDate, isToday, isYesterday, fromTimestamp, toTimestamp } from "system/helpers/index.ts";

formatDate(new Date(), "Y-m-d H:i:s"); // "2025-07-05 23:30:00"
timeAgo(new Date());                    // "방금 전", "5분 전", "2시간 전"
now();                                  // 현재 Date
nowFormatted("Y-m-d");                  // "2025-07-05"
daysBetween(date1, date2);              // 일수 차이
isToday(someDate);                      // true/false
isYesterday(someDate);                  // true/false
```

## 숫자 헬퍼

```typescript
import { formatNumber, formatCurrency, formatBytes, formatPercent, clamp, toRoman } from "system/helpers/index.ts";

formatNumber(1234567);    // "1,234,567"
formatCurrency(50000);    // "50,000원"
formatBytes(1024);        // "1.0 KB"
formatPercent(0.856);     // "85.6%"
clamp(15, 0, 10);         // 10
toRoman(2024);            // "MMXXIV"
```

## 배열 헬퍼

```typescript
import { element, elements, randomElement, groupBy, uniqueBy, chunk, flatten, deepMerge } from "system/helpers/index.ts";

element("key", obj, "default");    // 안전한 접근
randomElement([1, 2, 3]);          // 랜덤 요소
groupBy(items, "category");        // 카테고리별 그룹
uniqueBy(items, "id");             // ID 기준 중복 제거
chunk([1,2,3,4,5], 2);            // [[1,2],[3,4],[5]]
flatten([[1,2],[3,4]]);           // [1,2,3,4]
deepMerge(obj1, obj2);            // 깊은 병합
```

## 폼 헬퍼

```typescript
import { formOpen, formClose, formInput, formPassword, formEmail, formHidden, formTextarea, formUpload, formDropdown, formCheckbox, formRadio, formLabel, formSubmit, formReset, formButton, formError, csrfField, methodField, setValue, setSelect, setCheckbox, setRadio } from "system/helpers/index.ts";

formOpen("/posts", "POST");        // <form method="POST" action="/posts">
formClose();                        // </form>
formInput("title", "Hello");       // <input type="text" name="title" value="Hello">
formTextarea("body", "Content");    // <textarea name="body">Content</textarea>
formDropdown("status", [["draft","임시"],["pub","공개"]], "pub");
csrfField();                        // <input type="hidden" name="_csrf" value="...">
methodField("PUT");                 // <input type="hidden" name="_method" value="PUT">
formError("title", errors);         // 에러 메시지 표시
```

## HTML 헬퍼

```typescript
import { anchor, anchorPopup, mailto, img, heading, ul, ol, br, nbsp, meta, style, script } from "system/helpers/index.ts";

anchor("/posts/1", "보기");         // <a href="/posts/1">보기</a>
anchor("/posts/1", "보기", { class: "btn" });
mailto("test@test.com");           // <a href="mailto:test@test.com">test@test.com</a>
img("/images/logo.png");           // <img src="/images/logo.png" />
heading("제목", 1);                // <h1>제목</h1>
ul(["항목1", "항목2"]);            // <ul><li>항목1</li><li>항목2</li></ul>
style("/css/app.css");             // <link rel="stylesheet" href="/css/app.css" />
script("/js/app.js");              // <script src="/js/app.js"></script>
```

## 텍스트 헬퍼

```typescript
import { wordLimiter, characterLimiter, asciiOnly, convertAccentedChars, wordCensor, highlightPhrase, wordWrap, ellipsize, autoLink, nl2br } from "system/helpers/index.ts";

wordLimiter("Hello world this is a test", 3); // "Hello world this..."
characterLimiter("Long text here", 10);        // "Long text..."
asciiOnly("Café");                              // "Cafe"
wordCensor("bad word here", ["bad"]);           // "### word here"
highlightPhrase("Hello World", "World");        // "Hello <mark>World</mark>"
ellipsize("Very long text here", 10);           // "Very lo..."
autoLink("Visit http://example.com");           // URL 자동 링크
nl2br("Line1\nLine2");                          // "Line1<br>Line2"
```

## 인플렉터 헬퍼

```typescript
import { pluralize, singularize, classify, tableize, humanize } from "system/helpers/index.ts";

pluralize("post");       // "posts"
singularize("posts");    // "post"
classify("post_comments"); // "PostComment"
tableize("PostComment");   // "post_comments"
humanize("post_comment");  // "Post comment"
```

## Input 헬퍼 (Core)

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

## Autoload로 전역 접근

`app/config/autoload.ts` 에 등록하면 매번 import하지 않아도 됩니다:

```typescript
// app/config/autoload.ts
const autoload = {
  helpers: ["url", "string", "form", "html"],
  // ...
};

// 컨트롤러에서
import { autoloadRegistry } from "system/core/autoload.ts";
const { siteUrl } = autoloadRegistry.getHelper("url")!;
```

[→ Autoload 가이드](autoload.md)
