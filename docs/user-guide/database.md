# 🗃 데이터베이스 & 마이그레이션

## 데이터베이스 설정

`app/config/database.ts` 에서 설정합니다.

### SQLite (기본)

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

### 다중 연결

```typescript
const sql = await getDB();            // 기본
const analyticsDB = await getDB("analytics");  // 특정 그룹
```

### 어댑터 타입 조회

QueryBuilder에서 SQL 방언 분기에 사용:

```typescript
import { getDBAdapter } from "system/core/database.ts";

const adapter = getDBAdapter();           // "sqlite" | "postgres" | "mysql"
const adapter = getDBAdapter("analytics"); // 특정 그룹
```

### 테스트용 DB 주입

테스트 환경에서 메모리 DB를 직접 주입할 수 있습니다:

```typescript
import { SQL } from "bun";
import { setDB, resetDB } from "system/core/database.ts";

const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
setDB(sql, "default", "sqlite");

// 테스트 종료 후
resetDB();
await sql.close();
```

## 멀티 어댑터 SQL 방언

QueryBuilder는 DB 어댑터에 따라 자동으로 SQL 문법을 분기합니다:

### 식별자 이스케이프

| 어댑터 | 이스케이프 | 예시 |
|--------|-----------|------|
| SQLite | 쌍따옴표 | `"column"` |
| PostgreSQL | 쌍따옴표 | `"column"` |
| MySQL | 백틱 | `` `column` `` |

### LIMIT / OFFSET

| 어댑터 | 문법 | 예시 |
|--------|------|------|
| SQLite | 표준 | `LIMIT ? OFFSET ?` |
| PostgreSQL | 표준 | `LIMIT ? OFFSET ?` |
| MySQL | 레거시 | `LIMIT offset, count` |

### RETURNING * (INSERT/UPDATE 후 행 반환)

| 어댑터 | 지원 | 대체 방식 |
|--------|------|----------|
| SQLite | ✅ | `RETURNING *` 직접 사용 |
| PostgreSQL | ✅ | `RETURNING *` 직접 사용 |
| MySQL | ❌ | INSERT 후 `lastInsertId` → SELECT 재조회 |

```typescript
// insertReturning / updateReturning은 어댑터에 관계없이 동일하게 사용
const post = await qb.insertReturning("posts", { title: "Hello" });
const updated = await qb.where("id", 1).updateReturning("posts", { title: "Updated" });
```

## Query Builder (Active Record)

CodeIgniter3의 Active Record 패턴을 구현한 쿼리 빌더입니다.

```typescript
import { createQueryBuilder } from "system/core/query_builder.ts";

// 독립 사용
const posts = await createQueryBuilder()
  .select("id, title")
  .from("posts")
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .limit(10)
  .get();

// Model과 함께 사용
const posts = await postModel.qb()
  .where("published", 1)
  .like("title", "Bun")
  .orderBy("created_at", "DESC")
  .paginate(1, 10);
```

> 💡 Query Builder의 전체 API는 [Query Builder 문서](./query-builder.md)를 참조하세요.

## Raw Query (원시 쿼리)

QueryBuilder로 표현하기 어려운 복잡한 쿼리는 Bun SQL의 원시 쿼리 API를 직접 사용할 수 있습니다.
CodeIgniter3의 `$this->db->query()` 와 동일합니다.

### `sql\`...\` — 태그드 템플릿 리터럴 (권장)

Bun SQL의 태그드 템플릿 리터럴은 **자동 파라미터 바인딩**을 수행합니다.
`${}` 로 전달한 값은 항상 파라미터로 처리되어 **SQL 인젝션이 불가능**합니다.

```typescript
import { getDB } from "system/core/database.ts";

const sql = await getDB();

// ✅ 안전 — 값은 자동 파라미터 바인딩
const posts = await sql`SELECT * FROM posts WHERE published = ${1} ORDER BY created_at DESC`;

// ✅ 안전 — 여러 값 바인딩
const post = await sql`SELECT * FROM posts WHERE id = ${postId} AND author_id = ${userId}`;

// ✅ 안전 — INSERT/UPDATE/DELETE
await sql`INSERT INTO posts (title, content) VALUES (${title}, ${content})`;
await sql`UPDATE posts SET title = ${title} WHERE id = ${id}`;
await sql`DELETE FROM posts WHERE id = ${id}`;

// ✅ 안전 — JOIN + 서브쿼리 (구조는 문자열, 값은 바인딩)
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

> 💡 **핵심 규칙**: 테이블명, 컬럼명 등 **구조(식별자)**는 템플릿 리터럴 안에 하드코딩하고,
> **값(데이터)**만 `${}` 로 전달하세요.

### `sql.unsafe()` — 수동 바인딩

`sql.unsafe(query, bindings)` 는 `?` 플레이스홀더와 바인딩 배열을 수동으로 관리합니다.
QueryBuilder 내부에서 사용하는 방식입니다.

```typescript
// ✅ 안전 — ? 플레이스홀더 + 바인딩 배열
const rows = await sql.unsafe(
  "SELECT * FROM posts WHERE published = ? AND author_id = ? ORDER BY created_at DESC",
  [1, userId]
);

// ✅ 안전 — INSERT
await sql.unsafe(
  "INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)",
  [title, content, authorId]
);

// ❌ 위험 — 문자열 결합으로 값 직접 삽입 (SQL 인젝션 가능!)
await sql.unsafe(
  `SELECT * FROM posts WHERE title = '${userInput}'`  // 절대 금지!
);
```

### 동적 쿼리 작성 패턴

#### WHERE 조건 동적 추가

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

#### ORDER BY 컬럼 동적 선택

```typescript
// ✅ 화이트리스트로 허용된 컬럼만
const allowedSort = { date: "created_at", title: "title", author: "name" } as const;
const sortCol = allowedSort[userSort as keyof typeof allowedSort] ?? "created_at";

const rows = await sql.unsafe(
  `SELECT * FROM posts ORDER BY ${sortCol} DESC LIMIT ?`,
  [limit]
);
```

#### 테이블명 동적 선택

```typescript
// ✅ 화이트리스트로 허용된 테이블만
const allowedTables = ["posts", "users", "comments"] as const;
const table = allowedTables.includes(userTable as any) ? userTable : "posts";

const rows = await sql.unsafe(`SELECT * FROM ${table} LIMIT ?`, [limit]);
```

### 태그드 템플릿 vs `sql.unsafe()` 비교

| | `sql\`...\`` | `sql.unsafe()` |
|---|---|---|
| **파라미터 바인딩** | 자동 (`${}`) | 수동 (`?` + 배열) |
| **SQL 인젝션 방어** | ✅ 구조와 값 분리 | ⚠️ 올바른 사용 시에만 |
| **동적 쿼리** | ❌ 구조가 고정 | ✅ 조건부 WHERE 등 |
| **사용 사례** | 정적 쿼리, 간단한 CRUD | QueryBuilder, 동적 조건 |
| **CI3 동등** | `$this->db->query($sql, $binds)` | 동일 |

### ⚠️ 주의사항

1. **태그드 템플릿에 식별자(테이블명/컬럼명)를 `${}` 로 전달하지 마세요**
   - Bun SQL은 `${}` 값을 **문자열 리터럴**로 쿼리에 포함합니다
   - 즉, `` sql`SELECT * FROM ${tableName}` `` 는 `SELECT * FROM 'posts'` 가 되어 에러 발생
   - 테이블명/컬럼명은 화이트리스트 검증 후 문자열에 직접 포함

2. **`sql.unsafe()` 에서 절대 문자열 결합으로 값을 넣지 마세요**
   - 항상 `?` 플레이스홀더 + 바인딩 배열 사용

3. **동적 식별자는 항상 화이트리스트로 검증하세요**
   - 사용자 입력을 테이블명/컬럼명/ORDER BY에 직접 사용 금지
   - 허용 목록 매핑 또는 정규식 검증 사용

4. **복잡한 쿼리는 QueryBuilder를 우선 고려하세요**
   - QueryBuilder는 모든 식별자에 `validateColumnName()` 을 자동 적용
   - Raw Query는 QueryBuilder로 불가능한 경우에만 사용

---

## 마이그레이션

### 파일 구조

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

### 명령어

```bash
bun run igniter make:migration create_users_table --fields=name:string,email:string
bun run igniter migrate                    # 실행
bun run igniter migrate:rollback           # 1개 롤백
bun run igniter migrate:rollback --steps=3 # N개 롤백
bun run igniter migrate:rollback --all     # 전체 롤백
```

## 시드

```typescript
// database/seeds/user_seeder.ts
import { SQL } from "bun";
export async function run(sql: SQL): Promise<void> {
  await sql`INSERT INTO users (name, email) VALUES (${"Alice"}, ${"alice@test.com"})`;
}
```

```bash
bun run igniter make:seed user_seeder
bun run igniter db:seed
bun run igniter db:seed --files=user_seeder,post_seeder
```
