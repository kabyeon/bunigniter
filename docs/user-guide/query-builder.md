# 🔗 Query Builder (Active Record)

A query builder implementing CodeIgniter 3's Active Record pattern. Build intuitive SQL queries with method chaining.

## Getting Started

### Using with Model

```typescript
import { Model } from "system/core/model.ts";

export class PostModel extends Model<PostInterface> {
  override tableName = "posts";
}

const postModel = new PostModel();

// qb() method creates a QueryBuilder instance (tableName is auto-set)
const posts = await postModel.qb()
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .limit(10)
  .get();
```

### Standalone Usage

```typescript
import { createQueryBuilder } from "system/core/query_builder.ts";

const posts = await createQueryBuilder()
  .select("id, title, created_at")
  .from("posts")
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .limit(10)
  .get();
```

## CI3 ↔ BunIgniter Comparison

| CodeIgniter 3 | BunIgniter |
|---------------|------------|
| `$this->db->select('id, title')` | `.select('id, title')` |
| `$this->db->from('posts')` | `.from('posts')` |
| `$this->db->where('published', 1)` | `.where('published', 1)` |
| `$this->db->where('age >', 25)` | `.where('age >', 25)` |
| `$this->db->or_where('role', 'admin')` | `.orWhere('role', 'admin')` |
| `$this->db->where_in('id', [1,2])` | `.whereIn('id', [1,2])` |
| `$this->db->where_not_in('id', [1,2])` | `.whereNotIn('id', [1,2])` |
| `$this->db->like('title', 'search')` | `.like('title', 'search')` |
| `$this->db->or_like('title', 'search')` | `.orLike('title', 'search')` |
| `$this->db->join('users u', '...')` | `.join('users u', '...')` |
| `$this->db->order_by('id', 'DESC')` | `.orderBy('id', 'DESC')` |
| `$this->db->limit(10, 0)` | `.limit(10, 0)` |
| `$this->db->group_by('col')` | `.groupBy('col')` |
| `$this->db->distinct()` | `.distinct()` |
| `$this->db->get()->result()` | `.get()` |
| `$this->db->get()->row()` | `.first()` |
| `$this->db->insert($data)` | `.insert(table, data)` |
| `$this->db->update($data)` | `.update(table, data)` |
| `$this->db->delete()` | `.delete(table)` |
| `$this->db->count_all_results()` | `.count()` |

---

## Multi-Adapter SQL Dialect

QueryBuilder automatically branches SQL syntax based on the DB adapter:

### Identifier Escaping

| Adapter | Escape | Example |
|---------|--------|---------|
| SQLite | double quotes | `"column"` |
| PostgreSQL | double quotes | `"column"` |
| MySQL | backticks | `` `column` `` |

### LIMIT / OFFSET

| Adapter | Syntax | Example |
|---------|--------|---------|
| SQLite | standard | `LIMIT ? OFFSET ?` |
| PostgreSQL | standard | `LIMIT ? OFFSET ?` |
| MySQL | legacy | `LIMIT offset, count` |

### RETURNING * (return rows after INSERT/UPDATE)

| Adapter | Support | Fallback |
|---------|---------|----------|
| SQLite | ✅ | `RETURNING *` directly |
| PostgreSQL | ✅ | `RETURNING *` directly |
| MySQL | ❌ | INSERT then `lastInsertId` → SELECT re-query |

```typescript
// insertReturning / updateReturning work the same regardless of adapter
const post = await qb.insertReturning("posts", { title: "Hello" });
const updated = await qb.where("id", 1).updateReturning("posts", { title: "Updated" });
```

---

## SELECT

```typescript
// All columns
const posts = await postModel.qb().get();

// Specific columns
const posts = await postModel.qb()
  .select("id, title, created_at")
  .get();

// Aliases
const posts = await postModel.qb()
  .select("id, title, u.name as author_name")
  .from("posts p")
  .join("users u", "u.id = p.author_id")
  .get();
```

### DISTINCT

```typescript
const authors = await postModel.qb()
  .select("author_id")
  .distinct()
  .get();
```

### Aggregate Functions

```typescript
// COUNT
const total = await postModel.qb().count();                    // total count
const published = await postModel.qb().where("published", 1).count(); // conditional count

// SUM
const result = await createQueryBuilder()
  .selectSum("price", "total_price")
  .from("orders")
  .get();

// AVG, MAX, MIN
const result = await createQueryBuilder()
  .selectAvg("age", "avg_age")
  .selectMax("age", "max_age")
  .selectMin("age", "min_age")
  .from("users")
  .get();
```

### Getting Only the First Row

```typescript
const post = await postModel.qb()
  .where("slug", "hello-world")
  .first();

// Returns null if no result
if (!post) return response.status(404).json({ error: "Not Found" });
```

### Checking Existence

```typescript
const hasAdmin = await postModel.qb()
  .where("role", "admin")
  .exists();
// → true / false
```

---

## WHERE

### Basic WHERE

```typescript
// Simple condition (= operator)
.where("published", 1)
// → WHERE "published" = 1

// Operator specified (CI3: $this->db->where('age >', 25))
.where("age >", 25)
.where("created_at >=", "2025-01-01")
.where("id !=", 5)
```

### OR WHERE

```typescript
.where("role", "admin")
.orWhere("role", "author")
// → WHERE "role" = 'admin' OR "role" = 'author'
```

### WHERE IN

```typescript
.whereIn("id", [1, 2, 3])
// → WHERE "id" IN (1, 2, 3)

.whereNotIn("status", ["deleted", "banned"])
// → WHERE "status" NOT IN ('deleted', 'banned')
```

### WHERE BETWEEN

```typescript
.whereBetween("age", 20, 30)
// → WHERE "age" BETWEEN 20 AND 30
```

### NULL / NOT NULL

```typescript
.whereNull("deleted_at")
// → WHERE "deleted_at" IS NULL

.whereNotNull("email")
// → WHERE "email" IS NOT NULL
```

### LIKE Search

```typescript
// Both sides %search% (default)
.like("title", "BunIgniter")
// → WHERE "title" LIKE '%BunIgniter%'

// Before only %search
.like("title", "tutorial", "before")
// → WHERE "title" LIKE '%tutorial'

// After only search%
.like("slug", "bun", "after")
// → WHERE "slug" LIKE 'bun%'

// OR LIKE
.like("title", "Bun")
.orLike("content", "Bun")
// → WHERE "title" LIKE '%Bun%' OR "content" LIKE '%Bun%'
```

### Object Conditions (Batch)

```typescript
.whereObject({ published: 1, author_id: 1 })
// → WHERE "published" = 1 AND "author_id" = 1
```

### Raw Conditions

```typescript
// Direct SQL condition without value
.where("published = 1")
.where("created_at IS NOT NULL")
```

---

## JOIN

```typescript
// INNER JOIN (default)
.join("users u", "u.id = p.author_id")

// LEFT JOIN
.leftJoin("comments c", "c.post_id = p.id")

// RIGHT JOIN
.rightJoin("categories cat", "cat.id = p.category_id")

// CROSS JOIN
.join("tags t", "", "CROSS")
```

### JOIN Example

```typescript
const posts = await postModel.qb()
  .select("p.id, p.title, p.created_at, u.name as author_name, COUNT(c.id) as comment_count")
  .from("posts p")
  .join("users u", "u.id = p.author_id")
  .leftJoin("comments c", "c.post_id = p.id")
  .where("p.published", 1)
  .groupBy("p.id")
  .orderBy("p.created_at", "DESC")
  .get();
```

---

## ORDER BY / LIMIT / OFFSET

### Ordering

```typescript
.orderBy("created_at", "DESC")
.orderBy("title", "ASC")

// Convenience methods
.latest()            // created_at DESC
.oldest()            // created_at ASC
.latest("updated_at") // updated_at DESC
```

### LIMIT / OFFSET

```typescript
.limit(10)           // LIMIT 10
.limit(10, 20)       // LIMIT 10 OFFSET 20
.offset(20)          // OFFSET 20
```

---

## GROUP BY / HAVING

```typescript
const stats = await createQueryBuilder()
  .select("author_id, COUNT(*) as post_count, AVG(views) as avg_views")
  .from("posts")
  .groupBy("author_id")
  .having("post_count >", 5)
  .get();
```

---

## INSERT

```typescript
// Basic INSERT (returns insertId, affectedRows)
const result = await createQueryBuilder()
  .insert("posts", {
    title: "New Post",
    slug: "new-post",
    content: "Content",
    author_id: 1,
    published: 0,
  });
// result.insertId, result.affectedRows

// INSERT + return created row (SQLite RETURNING *)
const post = await postModel.qb()
  .insertReturning("posts", {
    title: "New Post",
    slug: "new-post",
    content: "Content",
    author_id: 1,
  });
// post.id, post.title, post.slug, ...
```

---

## UPDATE

```typescript
// WHERE required (safety feature)
const result = await postModel.qb()
  .where("id", 1)
  .update("posts", { title: "Updated Title", published: 1 });
// result.affectedRows

// UPDATE + return updated row
const post = await postModel.qb()
  .where("id", 1)
  .updateReturning("posts", { title: "Updated Title" });

// UPDATE without WHERE → throws error (safety feature)
await postModel.qb().update("posts", { title: "Hack" });
// → Error: WHERE clause is required for update (safety)
```

---

## DELETE

```typescript
// WHERE required (safety feature)
const result = await postModel.qb()
  .where("id", 1)
  .delete("posts");
// result.affectedRows

// DELETE without WHERE → throws error
await postModel.qb().delete("posts");
// → Error: WHERE clause is required for delete (safety)
```

---

## Pagination

```typescript
const result = await postModel.qb()
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .paginate(1, 10);
// → {
//     data: [...],        // current page data
//     total: 57,          // total records
//     page: 1,            // current page
//     perPage: 10,        // items per page
//     totalPages: 6,      // total pages
//     hasNext: true,      // next page exists
//     hasPrev: false,     // previous page exists
//   }
```

---

## Utilities

### clone — Clone Query

```typescript
const baseQuery = postModel.qb()
  .where("published", 1);

// Clone keeps original intact while adding conditions
const recentPosts = await baseQuery.clone()
  .orderBy("created_at", "DESC")
  .limit(5)
  .get();

const popularPosts = await baseQuery.clone()
  .orderBy("views", "DESC")
  .limit(5)
  .get();
```

### toSQL — Check SQL (Debug)

```typescript
const { query, bindings } = postModel.qb()
  .select("id, title")
  .where("published", 1)
  .orderBy("id", "DESC")
  .limit(10)
  .toSQL();

console.log(query);    // SELECT id, title FROM "posts" WHERE "published" = ? ORDER BY "id" DESC LIMIT ?
console.log(bindings); // [1, 10]
```

---

## SQL Injection Prevention

QueryBuilder performs whitelist validation on all column/table names:

### Column Name Validation

```typescript
// ✅ Safe — valid column names
.where("published", 1)
.where("age >", 25)
.whereIn("id", [1, 2, 3])
.orderBy("created_at", "DESC")
.groupBy("author_id")
.having("count >", 5)
.select("id, title, created_at")
.select("p.id, u.name as author_name")

// ❌ Blocked — SQL metacharacters present
.where("id; DROP TABLE users--", 1)    // → Error: Invalid column name
.where("id = 1 OR 1=1", 1)            // → Error: Invalid column name
.orderBy("(SELECT password FROM users)") // → Error: Invalid column name
.groupBy("1=1; DROP TABLE")            // → Error: Invalid column name
.having("count; DROP TABLE", 5)        // → Error: Invalid column name

// ❌ Blocked — subquery injection
.select("(SELECT password FROM users LIMIT 1) as leaked")
// → Error: Subquery not allowed in select(). Use selectRaw() instead

// ❌ Blocked — dangerous functions
.select("LOAD_FILE('/etc/passwd') as data")  // → Error: Dangerous function
.select("SLEEP(5) as delay")                  // → Error: Dangerous function

// ❌ Blocked — malicious INSERT/UPDATE column names
.insert("users", { "role; DROP TABLE": "admin" })  // → Error: Invalid column name
```

### Raw Methods (Complex Expressions)

Use `*Raw()` methods for functions, subqueries, and other complex SQL.
⚠️ **Do not pass user input directly to Raw methods.**

```typescript
// selectRaw — subqueries, functions
.selectRaw("(SELECT name FROM users WHERE id = p.author_id) as author_name")
.selectRaw("COALESCE(title, 'No Title') as title")

// orderByRaw — complex ordering
.orderByRaw("FIELD(status, 'active', 'pending', 'closed')")

// groupByRaw — complex grouping
.groupByRaw("DATE(created_at)")
```

### Value Binding

Values are always passed via `?` parameter binding to prevent SQL injection:

```typescript
.where("title", userInput)   // → WHERE "title" = ?  [userInput bound]
.like("title", userInput)    // → WHERE "title" LIKE ?  ['%userInput%']
.insert("posts", data)       // → INSERT INTO "posts" (title) VALUES (?)  [data.title]
```

---

## Real-World Example — Blog API

```typescript
// GET /api/posts — pagination + JOIN
async index({ query }: Context) {
  const page = Number(query.page ?? "1");
  const perPage = Number(query.per_page ?? "10");

  const result = await postModel.qb()
    .select("p.id, p.title, p.slug, p.excerpt, p.published, p.created_at, u.name as author_name")
    .from("posts p")
    .join("users u", "u.id = p.author_id")
    .where("p.published", 1)
    .orderBy("p.created_at", "DESC")
    .paginate(page, perPage);

  return this.json(result);
}

// GET /api/posts/:id — detail + comments
async show({ params, response }: Context) {
  const post = await postModel.qb()
    .select("p.*, u.name as author_name")
    .from("posts p")
    .join("users u", "u.id = p.author_id")
    .where("p.id", Number(params.id))
    .first();

  if (!post) return response.status(404).json({ error: "Not Found" });

  const comments = await postModel.qb()
    .select("id, author_name, content, created_at")
    .from("comments")
    .where("post_id", post.id)
    .orderBy("created_at", "DESC")
    .get();

  return this.json({ data: { ...post, comments } });
}

// POST /api/posts — create
async store({ body, response }: Context) {
  const data = body();
  if (!data.title) return response.status(422).json({ error: "title required" });

  const exists = await postModel.exists({ slug: data.slug });
  if (exists) return response.status(409).json({ error: "Duplicate slug" });

  const created = await postModel.create({ ...data, author_id: 1 });
  return this.json({ data: created }, 201);
}

// PUT /api/posts/:id — update
async update({ body, params, response }: Context) {
  const existing = await postModel.findById(Number(params.id));
  if (!existing) return response.status(404).json({ error: "Not Found" });

  const updated = await postModel.update(Number(params.id), body());
  return this.json({ data: updated });
}

// DELETE /api/posts/:id — delete
async delete({ params, response }: Context) {
  const deleted = await postModel.delete(Number(params.id));
  if (!deleted) return response.status(404).json({ error: "Not Found" });
  return this.json({ data: { deleted: true } });
}

// Search — LIKE + OR
async search({ query }: Context) {
  const keyword = query.q ?? "";
  const posts = await postModel.qb()
    .like("title", keyword)
    .orLike("content", keyword)
    .where("published", 1)
    .orderBy("created_at", "DESC")
    .limit(20)
    .get();

  return this.json({ data: posts });
}
```
