# 🧰 Helper Functions

Provides helper functions organized into 9 categories (82 functions total).
Each category is in its own file, with `system/helpers/index.ts` re-exporting everything.
Alternatively, you can import individual files directly as needed.

---

## URL Helper (`system/helpers/url_helper.ts`)

```typescript
import { siteUrl, baseUrl, redirect, currentUrl } from "system/helpers/url_helper.ts";

siteUrl("posts/1");  // "http://localhost:3000/posts/1"
baseUrl();           // "http://localhost:3000"
currentUrl(request); // current request URL
redirect("/login");  // 302 redirect Response
```

---

## String Helper (`system/helpers/string_helper.ts`)

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

## Date Helper (`system/helpers/date_helper.ts`)

```typescript
import { formatDate, timeAgo, now, nowFormatted, daysBetween, isValidDate, isToday, isYesterday, fromTimestamp, toTimestamp } from "system/helpers/date_helper.ts";

formatDate(new Date(), "Y-m-d H:i:s"); // "2025-07-05 23:30:00"
timeAgo(new Date());                    // "just now", "5 minutes ago", "2 hours ago"
now();                                  // current Unix timestamp (seconds)
nowFormatted("Y-m-d");                  // "2025-07-05"
daysBetween(date1, date2);              // number of days difference
isValidDate(someDate);                  // true/false
isToday(someDate);                      // true/false
isYesterday(someDate);                  // true/false
fromTimestamp(1700000000);              // Date object
toTimestamp(someDate);                  // Unix timestamp (seconds)
```

---

## Number Helper (`system/helpers/number_helper.ts`)

```typescript
import { formatNumber, formatCurrency, formatBytes, formatPercent, plural, clamp, toRoman } from "system/helpers/number_helper.ts";

formatNumber(1234567);            // "1,234,567"
formatCurrency(50000);            // "$50,000"
formatBytes(1024);                // "1.0 KB"
formatPercent(856, 1000);         // "85.6%"
plural(1, "post");                // "post"
plural(5, "post");                // "posts"
clamp(15, 0, 10);                 // 10
toRoman(2024);                    // "MMXXIV"
```

---

## Array Helper (`system/helpers/array_helper.ts`)

```typescript
import { element, elements, randomElement, groupBy, uniqueBy, chunk, flatten, toEntries, fromEntries, deepMerge } from "system/helpers/array_helper.ts";

element("key", obj, "default");   // safe access
elements(["a", "b"], obj);        // multiple key lookup
randomElement([1, 2, 3]);         // random element
groupBy(items, "category");       // group by category
uniqueBy(items, "id");            // deduplicate by ID
chunk([1,2,3,4,5], 2);           // [[1,2],[3,4],[5]]
flatten([[1,2],[3,4]]);          // [1,2,3,4]
toEntries({ a: 1, b: 2 });       // [["a",1],["b",2]]
fromEntries([["a",1],["b",2]]);  // { a: 1, b: 2 }
deepMerge(obj1, obj2);           // deep merge
```

---

## Form Helper (`system/helpers/form_helper.ts`)

```typescript
import { formOpen, formOpenMultipart, formClose, formInput, formPassword, formEmail, formNumber, formHidden, formTextarea, formUpload, formDropdown, formMultiselect, formCheckbox, formRadio, formLabel, formSubmit, formReset, formButton, formError, csrfField, methodField, setValue, setSelect, setCheckbox, setRadio } from "system/helpers/form_helper.ts";

formOpen("/posts", { method: "POST" });           // <form action="..." method="POST">
formOpenMultipart("/upload");                     // multipart form tag
formClose();                                       // </form>
formInput("title", "Hello");                      // <input type="text" name="title">
formPassword("pw");                                // <input type="password">
formEmail("email");                                // <input type="email">
formNumber("age", "25");                           // <input type="number">
formHidden("id", "1");                              // <input type="hidden">
formTextarea("body", "Content");                   // <textarea name="body">
formUpload("avatar");                               // <input type="file">
formDropdown("status", { draft: "Draft", pub: "Published" }, "pub");
formMultiselect("tags", { ts: "TypeScript", js: "JavaScript" }, ["ts"]);
formCheckbox("agree", "yes", true);                // checked checkbox
formRadio("gender", "male");                       // radio button
formLabel("Name", "name");                          // <label for="name">
formSubmit("", "Submit");                            // submit button
formReset();                                        // reset button
formButton("btn", "Click");                          // <button>
formError("title", errors, "<p>", "</p>");         // error message
csrfField(token);                                   // CSRF hidden input
methodField("PUT");                                 // _method hidden input
setValue("title", "default", oldInput);             // restore previous value
setSelect("status", "pub", false, oldInput);        // restore select
setCheckbox("agree", "yes", false, oldInput);       // restore checkbox
setRadio("gender", "male", false, oldInput);        // restore radio
```

---

## HTML Helper (`system/helpers/html_helper.ts`)

```typescript
import { anchor, anchorPopup, mailto, img, heading, ul, ol, br, nbsp, meta, style, script } from "system/helpers/html_helper.ts";

anchor("/posts/1", "View");         // <a href="/posts/1">View</a>
anchor("/posts/1", "View", { class: "btn" });
anchorPopup("/link", "New Window");       // target="_blank" + rel="noopener noreferrer"
mailto("test@test.com");           // <a href="mailto:test@test.com">test@test.com</a>
img("/images/logo.png");           // <img src="/images/logo.png" />
heading("Title", 1);                // <h1>Title</h1>
ul(["Item 1", "Item 2"]);            // <ul><li>Item 1</li><li>Item 2</li></ul>
ol(["1", "2"]);                    // <ol><li>1</li><li>2</li></ol>
br(2);                             // <br /><br />
nbsp(3);                           // &nbsp;&nbsp;&nbsp;
meta("description", "Description");       // <meta name="description" content="Description">
meta("og:title", "Title", "property"); // <meta property="og:title" content="Title">
style("/css/app.css");             // <link rel="stylesheet" href="/css/app.css" />
script("/js/app.js");              // <script src="/js/app.js"></script>
```

---

## Text Helper (`system/helpers/text_helper.ts`)

```typescript
import { wordLimiter, characterLimiter, asciiOnly, convertAccentedChars, wordCensor, highlightPhrase, wordWrap, ellipsize, autoLink, nl2br } from "system/helpers/text_helper.ts";

wordLimiter("Hello world this is a test", 3); // "Hello world this..."
characterLimiter("Long text here", 10);        // "Long text..."
asciiOnly("Café");                              // "Cafe"
convertAccentedChars("Café");                   // "Cafe"
wordCensor("bad word here", ["bad"]);           // "*** word here"
highlightPhrase("Hello World", "World");        // "Hello <mark>World</mark>"
wordWrap("Long text...", 10);                   // word wrap
ellipsize("Very long text here", 10);           // "Very lo..."
autoLink("Visit http://example.com");           // auto-link URL
nl2br("Line1\nLine2");                          // "Line1<br />Line2"
```

---

## Inflector Helper (`system/helpers/inflector_helper.ts`)

```typescript
import { pluralize, singularize, classify, tableize, humanize } from "system/helpers/inflector_helper.ts";

pluralize("post");              // "posts"
pluralize("person");            // "people" (irregular)
singularize("posts");           // "post"
singularize("children");        // "child" (irregular)
classify("post_comments");      // "PostComment"
tableize("PostComment");        // "post_comments"
humanize("post_comment");       // "Post comment"
```

---

## Input Helper (Core)

```typescript
import { Input } from "system/core/input.ts";

Input.post(request, "name");       // POST data
Input.get(request, "page");        // GET parameters
Input.header(request, "auth");     // headers
Input.method(request);             // "GET", "POST"
Input.ip(request);                 // client IP
Input.userAgent(request);          // User Agent
Input.isAjax(request);             // check if AJAX
Input.isJson(request);             // check if JSON request
```

## Global Access via Autoload

Register helpers in `app/config/autoload.ts` and use them without importing each time:

```typescript
// app/config/autoload.ts
const autoload = {
  helpers: ["url", "string", "form", "html"],
  // ...
};

// In a controller
import { autoloadRegistry } from "system/core/autoload.ts";
const { siteUrl } = autoloadRegistry.getHelper("url")!;
```

[→ Autoload Guide](autoload.md)
