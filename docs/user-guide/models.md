# 🗄 Models

Extend the `Model<T>` generic class to create models.

## Basic Structure

```typescript
import { Model } from "system/core/model.ts";

export interface UserInterface {
  id?: number;
  name?: string;
  email?: string;
  age?: number;
  created_at?: string;
  updated_at?: string;
}

export class UserModel extends Model<UserInterface> {
  override tableName = "users";  // must override
}

export default new UserModel();
```

## CRUD Methods

| Method | Description | CI3 Equivalent |
|--------|-------------|----------------|
| `findAll()` | Find all records | `$this->db->get()->result()` |
| `findById(id)` | Find by ID | `$this->db->where('id', $id)->get()->row()` |
| `findWhere(conditions)` | Find by conditions | `$this->db->where($conditions)->get()->result()` |
| `findFirst(conditions)` | Find first matching row | `$this->db->where($conditions)->get()->row()` |
| `create(data)` | Create record | `$this->db->insert($data)` |
| `update(id, data)` | Update record | `$this->db->where('id', $id)->update($data)` |
| `updateWhere(conds, data)` | Conditional update | `$this->db->where($conds)->update($data)` |
| `delete(id)` | Delete record | `$this->db->where('id', $id)->delete()` |
| `deleteWhere(conditions)` | Conditional delete | `$this->db->where($conds)->delete()` |
| `count(conditions?)` | Count records | `$this->db->count_all_results()` |
| `exists(conditions)` | Check existence | - |
| `limit(limit, offset)` | Limit query | `$this->db->limit()->get()->result()` |
| `paginate(page, perPage)` | Pagination | - |
| `transaction(callback)` | Transaction | `$this->db->trans_start()` |

## Basic Usage Examples

```typescript
import userModel from "app/models/user_model.ts";

// Query
const users = await userModel.findAll();
const user = await userModel.findById(1);
const active = await userModel.findWhere({ email: "test@example.com" });
const admin = await userModel.findFirst({ role: "admin" });

// Create
const newUser = await userModel.create({ name: "Alice", email: "alice@test.com" });

// Update
await userModel.update(1, { name: "Updated" });
await userModel.updateWhere({ role: "guest" }, { age: 25 }); // conditional update

// Delete
await userModel.delete(1);
const deleted = await userModel.deleteWhere({ role: "temp" }); // conditional delete

// Count / Exists
const total = await userModel.count();
const adminCount = await userModel.count({ role: "admin" });
const hasAdmin = await userModel.exists({ role: "admin" }); // true/false

// Pagination
const result = await userModel.paginate(2, 15);
// { data: [...], total: 100, page: 2, perPage: 15, totalPages: 7, hasNext: true, hasPrev: true }

// Transaction
await userModel.transaction(async (tx) => {
  await tx`INSERT INTO users (name) VALUES (${"Alice"})`;
});
```

## Query Builder (Active Record)

Use the `qb()` method for CodeIgniter 3-style query builder:

```typescript
// Basic — tableName auto-set
const posts = await postModel.qb()
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .limit(10)
  .get();

// JOIN + aliases
const posts = await postModel.qb()
  .select("p.id, p.title, u.name as author_name")
  .from("posts p")
  .join("users u", "u.id = p.author_id")
  .where("p.published", 1)
  .orderBy("p.created_at", "DESC")
  .get();

// Search
const results = await postModel.qb()
  .like("title", "BunIgniter")
  .orLike("content", "BunIgniter")
  .where("published", 1)
  .get();

// Pagination
const page = await postModel.qb()
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .paginate(1, 10);
// → { data, total, page, perPage, totalPages, hasNext, hasPrev }
```

> 💡 For the full Query Builder API, see the [Query Builder documentation](./query-builder.md).

## Static Query Builder

You can use the `query()` static method without an instance:

```typescript
class UserModel extends Model<UserInterface> {
  override tableName = "users";
}

// Static call
const admins = await UserModel.query()
  .where("role", "admin")
  .get();
```

## Direct SQL

```typescript
import { getDB } from "system/core/database.ts";
const sql = await getDB();

// Tagged template literal (auto-escaped)
const users = await sql`SELECT * FROM users WHERE age > ${20}`;

// Object insert
await sql`INSERT INTO users ${sql({ name: "Alice" })}`;
```
