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
