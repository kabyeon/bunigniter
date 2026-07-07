# 🧰 헬퍼 함수

9개 카테고리(82개 함수)로 분리된 헬퍼 함수를 제공합니다.
각 카테고리는 개별 파일로 분리되어 있으며, `system/helpers/index.ts` 에서 전체 재export합니다.
또는 필요한 파일만 직접 임포트할 수 있습니다.

---

## URL 헬퍼 (`system/helpers/url_helper.ts`)

```typescript
import { siteUrl, baseUrl, redirect, currentUrl } from "system/helpers/url_helper.ts";

siteUrl("posts/1");  // "http://localhost:3000/posts/1"
baseUrl();           // "http://localhost:3000"
currentUrl(request); // 현재 요청 URL
redirect("/login");  // 302 리다이렉트 Response
```

---

## 문자열 헬퍼 (`system/helpers/string_helper.ts`)

```typescript
import { slug, truncate, escapeHtml, unescapeHtml, camelize, pascalize, snakeCase, kebabCase, ucwords, randomString, reduceMultiples, stripQuotes } from "system/helpers/string_helper.ts";

slug("Hello World");          // "hello-world"
truncate("Long text...", 10); // "Long text..."
escapeHtml("<b>bold</b>");    // "&lt;b&gt;bold&lt;/b&gt;"
unescapeHtml("&lt;b&gt;");    // "<b>"
camelize("hello_world");      // "helloWorld"
pascalize("hello_world");     // "HelloWorld"
snakeCase("HelloWorld");      // "hello_world"
kebabCase("HelloWorld");      // "hello-world"
ucwords("hello world");       // "Hello World"
randomString("alnum", 16);    // "a3f8b2c1d4e5f6g7" (alpha/alnum/numeric/hex)
reduceMultiples("a,,,b", ",");// "a,b"
stripQuotes("'hello'");       // "hello"
```

---

## 날짜 헬퍼 (`system/helpers/date_helper.ts`)

```typescript
import { formatDate, timeAgo, now, nowFormatted, daysBetween, isValidDate, isToday, isYesterday, fromTimestamp, toTimestamp } from "system/helpers/date_helper.ts";

formatDate(new Date(), "Y-m-d H:i:s"); // "2025-07-05 23:30:00"
timeAgo(new Date());                    // "방금 전", "5분 전", "2시간 전"
now();                                  // 현재 Unix timestamp (초)
nowFormatted("Y-m-d");                  // "2025-07-05"
daysBetween(date1, date2);              // 일수 차이
isValidDate(someDate);                  // true/false
isToday(someDate);                      // true/false
isYesterday(someDate);                  // true/false
fromTimestamp(1700000000);              // Date 객체
toTimestamp(someDate);                  // Unix timestamp (초)
```

---

## 숫자 헬퍼 (`system/helpers/number_helper.ts`)

```typescript
import { formatNumber, formatCurrency, formatBytes, formatPercent, plural, clamp, toRoman } from "system/helpers/number_helper.ts";

formatNumber(1234567);            // "1,234,567"
formatCurrency(50000);            // "50,000원"
formatBytes(1024);                // "1.0 KB"
formatPercent(856, 1000);         // "85.6%"
plural(1, "post");                // "post"
plural(5, "post");                // "posts"
clamp(15, 0, 10);                 // 10
toRoman(2024);                    // "MMXXIV"
```

---

## 배열 헬퍼 (`system/helpers/array_helper.ts`)

```typescript
import { element, elements, randomElement, groupBy, uniqueBy, chunk, flatten, toEntries, fromEntries, deepMerge } from "system/helpers/array_helper.ts";

element("key", obj, "default");   // 안전한 접근
elements(["a", "b"], obj);        // 복수 키 조회
randomElement([1, 2, 3]);         // 랜덤 요소
groupBy(items, "category");       // 카테고리별 그룹
uniqueBy(items, "id");            // ID 기준 중복 제거
chunk([1,2,3,4,5], 2);           // [[1,2],[3,4],[5]]
flatten([[1,2],[3,4]]);          // [1,2,3,4]
toEntries({ a: 1, b: 2 });       // [["a",1],["b",2]]
fromEntries([["a",1],["b",2]]);  // { a: 1, b: 2 }
deepMerge(obj1, obj2);           // 깊은 병합
```

---

## 폼 헬퍼 (`system/helpers/form_helper.ts`)

```typescript
import { formOpen, formOpenMultipart, formClose, formInput, formPassword, formEmail, formNumber, formHidden, formTextarea, formUpload, formDropdown, formMultiselect, formCheckbox, formRadio, formLabel, formSubmit, formReset, formButton, formError, csrfField, methodField, setValue, setSelect, setCheckbox, setRadio } from "system/helpers/form_helper.ts";

formOpen("/posts", { method: "POST" });           // <form action="..." method="POST">
formOpenMultipart("/upload");                     // multipart 폼 태그
formClose();                                       // </form>
formInput("title", "Hello");                      // <input type="text" name="title">
formPassword("pw");                                // <input type="password">
formEmail("email");                                // <input type="email">
formNumber("age", "25");                           // <input type="number">
formHidden("id", "1");                              // <input type="hidden">
formTextarea("body", "Content");                   // <textarea name="body">
formUpload("avatar");                               // <input type="file">
formDropdown("status", { draft: "임시", pub: "공개" }, "pub");
formMultiselect("tags", { ts: "TypeScript", js: "JavaScript" }, ["ts"]);
formCheckbox("agree", "yes", true);                // 체크된 체크박스
formRadio("gender", "male");                       // 라디오
formLabel("이름", "name");                          // <label for="name">
formSubmit("", "전송");                              // 제출 버튼
formReset();                                        // 리셋 버튼
formButton("btn", "클릭");                          // <button>
formError("title", errors, "<p>", "</p>");         // 에러 메시지
csrfField(token);                                   // CSRF hidden input
methodField("PUT");                                 // _method hidden input
setValue("title", "기본값", oldInput);              // 이전값 복원
setSelect("status", "pub", false, oldInput);        // select 복원
setCheckbox("agree", "yes", false, oldInput);       // checkbox 복원
setRadio("gender", "male", false, oldInput);        // radio 복원
```

---

## HTML 헬퍼 (`system/helpers/html_helper.ts`)

```typescript
import { anchor, anchorPopup, mailto, img, heading, ul, ol, br, nbsp, meta, style, script } from "system/helpers/html_helper.ts";

anchor("/posts/1", "보기");         // <a href="/posts/1">보기</a>
anchor("/posts/1", "보기", { class: "btn" });
anchorPopup("/link", "새창");       // target="_blank" + rel="noopener noreferrer"
mailto("test@test.com");           // <a href="mailto:test@test.com">test@test.com</a>
img("/images/logo.png");           // <img src="/images/logo.png" />
heading("제목", 1);                // <h1>제목</h1>
ul(["항목1", "항목2"]);            // <ul><li>항목1</li><li>항목2</li></ul>
ol(["1", "2"]);                    // <ol><li>1</li><li>2</li></ol>
br(2);                             // <br /><br />
nbsp(3);                           // &nbsp;&nbsp;&nbsp;
meta("description", "설명");       // <meta name="description" content="설명">
meta("og:title", "제목", "property"); // <meta property="og:title" content="제목">
style("/css/app.css");             // <link rel="stylesheet" href="/css/app.css" />
script("/js/app.js");              // <script src="/js/app.js"></script>
```

---

## 텍스트 헬퍼 (`system/helpers/text_helper.ts`)

```typescript
import { wordLimiter, characterLimiter, asciiOnly, convertAccentedChars, wordCensor, highlightPhrase, wordWrap, ellipsize, autoLink, nl2br } from "system/helpers/text_helper.ts";

wordLimiter("Hello world this is a test", 3); // "Hello world this..."
characterLimiter("Long text here", 10);        // "Long text..."
asciiOnly("Café");                              // "Cafe"
convertAccentedChars("Café");                   // "Cafe"
wordCensor("bad word here", ["bad"]);           // "*** word here"
highlightPhrase("Hello World", "World");        // "Hello <mark>World</mark>"
wordWrap("Long text...", 10);                   // 줄바꿈
ellipsize("Very long text here", 10);           // "Very lo..."
autoLink("Visit http://example.com");           // URL 자동 링크
nl2br("Line1\nLine2");                          // "Line1<br />Line2"
```

---

## 인플렉터 헬퍼 (`system/helpers/inflector_helper.ts`)

```typescript
import { pluralize, singularize, classify, tableize, humanize } from "system/helpers/inflector_helper.ts";

pluralize("post");              // "posts"
pluralize("person");            // "people" (불규칙)
singularize("posts");           // "post"
singularize("children");        // "child" (불규칙)
classify("post_comments");      // "PostComment"
tableize("PostComment");        // "post_comments"
humanize("post_comment");       // "Post comment"
```

---

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

[→ Autoload 가이드](autoload.ko.md)
