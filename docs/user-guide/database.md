# 🗃 Database & Migrations

## Database Configuration

Configured in `app/config/database.ts`.

### SQLite (default)

```typescript
const config = {
  defaultGroup: "default",
  groups: {
    default: { adapter: "sqlite", filename: "./database/bunigniter.db", create: true },
  },
};
```

### PostgreSQL

```typescript
default: { adapter: "postgres", url: "postgres://user:pass@localhost:5432/mydb" }
```

### MySQL

```typescript
default: { adapter: "mysql", url: "mysql://user:pass@localhost:3306/mydb" }
```

### Multiple Connections

```typescript
const sql = await getDB();            // default
const analyticsDB = await getDB("analytics");  // specific group
```

### Get Adapter Type

Used for SQL dialect branching in QueryBuilder:

```typescript
import { getDBAdapter } from "system/core/database.ts";

const adapter = getDBAdapter();           // "sqlite" | "postgres" | "mysql"
const adapter = getDBAdapter("analytics"); // specific group
```

### Test DB Injection

You can inject an in-memory DB directly in test environments:

```typescript
import { SQL } from "bun";
import { setDB, resetDB } from "system/core/database.ts";

const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
setDB(sql, "default", "sqlite");

// After tests
resetDB();
await sql.close();
```

## Multi-Adapter SQL Dialects

QueryBuilder automatically branches SQL syntax based on the DB adapter:

### Identifier Escaping

| Adapter | Escape | Example |
|---------|--------|---------|
| SQLite | Double quotes | `"column"` |
| PostgreSQL | Double quotes | `"column"` |
| MySQL | Backticks | `` `column` `` |

### LIMIT / OFFSET

| Adapter | Syntax | Example |
|---------|--------|---------|
| SQLite | Standard | `LIMIT ? OFFSET ?` |
| PostgreSQL | Standard | `LIMIT ? OFFSET ?` |
| MySQL | Legacy | `LIMIT offset, count` |

### RETURNING * (return rows after INSERT/UPDATE)

| Adapter | Support | Alternative |
|---------|---------|-------------|
| SQLite | ✅ | Direct `RETURNING *` |
| PostgreSQL | ✅ | Direct `RETURNING *` |
| MySQL | ❌ | INSERT with `lastInsertId` → SELECT re-query |

```typescript
// insertReturning / updateReturning work the same regardless of adapter
const post = await qb.insertReturning("posts", { title: "Hello" });
const updated = await qb.where("id", 1).updateReturning("posts", { title: "Updated" });
```

## Query Builder (Active Record)

Implements CodeIgniter 3's Active Record pattern.

```typescript
import { createQueryBuilder } from "system/core/query_builder.ts";

// Standalone usage
const posts = await createQueryBuilder()
  .select("id, title")
  .from("posts")
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .limit(10)
  .get();

// With Model
const posts = await postModel.qb()
  .where("published", 1)
  .like("title", "Bun")
  .orderBy("created_at", "DESC")
  .paginate(1, 10);
```

> 💡 For the full Query Builder API, see the [Query Builder documentation](./query-builder.md).

## Raw Queries

For complex queries that are difficult to express with QueryBuilder, you can use Bun SQL's raw query API directly. Same as CI3's `$this->db->query()`.

### `sql\`...\`` — Tagged Template Literal (recommended)

Bun SQL's tagged template literals perform **automatic parameter binding**.
Values passed via `${}` are always treated as parameters, making **SQL injection impossible**.

```typescript
import { getDB } from "system/core/database.ts";

const sql = await getDB();

// ✅ Safe — values are auto-bound as parameters
const posts = await sql`SELECT * FROM posts WHERE published = ${1} ORDER BY created_at DESC`;

// ✅ Safe — multiple value bindings
const post = await sql`SELECT * FROM posts WHERE id = ${postId} AND author_id = ${userId}`;

// ✅ Safe — INSERT/UPDATE/DELETE
await sql`INSERT INTO posts (title, content) VALUES (${title}, ${content})`;
await sql`UPDATE posts SET title = ${title} WHERE id = ${id}`;
await sql`DELETE FROM posts WHERE id = ${id}`;

// ✅ Safe — JOIN + subquery (structure is literal, values are bound)
const results = await sql`
  SELECT p.*, u.name as author_name,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
  FROM posts p
  JOIN users u ON u.id = p.author_id
  WHERE p.published = ${1}
  ORDER BY p.created_at DESC
  LIMIT ${perPage} OFFSET ${offset}
`;
```

> 💡 **Key rule**: Hardcode **structure (identifiers)** like table names and column names inside the template literal.
> Only pass **values (data)** via `${}`.

### `sql.unsafe()` — Manual Binding

`sql.unsafe(query, bindings)` manually manages `?` placeholders and a bindings array. Used internally by QueryBuilder.

```typescript
// ✅ Safe — ? placeholders + bindings array
const rows = await sql.unsafe(
  "SELECT * FROM posts WHERE published = ? AND author_id = ? ORDER BY created_at DESC",
  [1, userId]
);

// ✅ Safe — INSERT
await sql.unsafe(
  "INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)",
  [title, content, authorId]
);

// ❌ Dangerous — string concatenation for values (SQL injection possible!)
await sql.unsafe(
  `SELECT * FROM posts WHERE title = '${userInput}'`  // never do this!
);
```

### Dynamic Query Patterns

#### Dynamic WHERE Conditions

```typescript
const conditions: string[] = [];
const bindings: any[] = [];

if (search) {
  conditions.push("title LIKE ?");
  bindings.push(`%${search}%`);
}
if (authorId) {
  conditions.push("author_id = ?");
  bindings.push(authorId);
}

const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
const rows = await sql.unsafe(
  `SELECT * FROM posts ${where} ORDER BY created_at DESC`,
  bindings
);
```

#### Dynamic ORDER BY Column

```typescript
// ✅ Only allow columns from a whitelist
const allowedSort = { date: "created_at", title: "title", author: "name" } as const;
const sortCol = allowedSort[userSort as keyof typeof allowedSort] ?? "created_at";

const rows = await sql.unsafe(
  `SELECT * FROM posts ORDER BY ${sortCol} DESC LIMIT ?`,
  [limit]
);
```

#### Dynamic Table Name

```typescript
// ✅ Only allow tables from a whitelist
const allowedTables = ["posts", "users", "comments"] as const;
const table = allowedTables.includes(userTable as any) ? userTable : "posts";

const rows = await sql.unsafe(`SELECT * FROM ${table} LIMIT ?`, [limit]);
```

### Tagged Template vs `sql.unsafe()` Comparison

| Feature | `sql\`...\`` | `sql.unsafe()` |
|---------|--------------|----------------|
| **Parameter binding** | Auto (`${}`) | Manual (`?` + array) |
| **SQL injection defense** | ✅ Structure/value separation | ⚠️ Only with correct usage |
| **Dynamic queries** | ❌ Structure is fixed | ✅ Conditional WHERE etc. |
| **Use cases** | Static queries, simple CRUD | QueryBuilder, dynamic conditions |
| **CI3 equivalent** | `$this->db->query($sql, $binds)` | Same |

### ⚠️ Important Notes

1. **Do not pass identifiers (table/column names) with `${}` in tagged templates**
   - Bun SQL treats `${}` values as **string literals** in the query
   - So `` sql`SELECT * FROM ${tableName}` `` becomes `SELECT * FROM 'posts'` and causes an error
   - Use whitelist validation then include identifiers directly in the string

2. **Never use string concatenation for values in `sql.unsafe()`**
   - Always use `?` placeholders + bindings array

3. **Always validate dynamic identifiers with a whitelist**
   - Never use user input directly for table names, column names, or ORDER BY
   - Use an allowed-list mapping or regex validation

4. **Prefer QueryBuilder for complex queries**
   - QueryBuilder auto-applies `validateColumnName()` on all identifiers
   - Raw queries should only be used when QueryBuilder cannot express the query

---

## Migrations

### File Structure

```typescript
import { SQL } from "bun";

export async function up(sql: SQL): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`;
}

export async function down(sql: SQL): Promise<void> {
  await sql`DROP TABLE IF EXISTS users`;
}
```

### Commands

```bash
bun run bi make:migration create_users_table --fields=name:string,email:string
bun run bi migrate                    # Run
bun run bi migrate:rollback           # Rollback 1
bun run bi migrate:rollback --steps=3 # Rollback N
bun run bi migrate:rollback --all     # Rollback all
```

## Seeds

```typescript
// database/seeds/user_seeder.ts
import { SQL } from "bun";
export async function run(sql: SQL): Promise<void> {
  await sql`INSERT INTO users (name, email) VALUES (${"Alice"}, ${"alice@test.com"})`;
}
```

```bash
bun run bi make:seed user_seeder
bun run bi db:seed
bun run bi db:seed --files=user_seeder,post_seeder
```
