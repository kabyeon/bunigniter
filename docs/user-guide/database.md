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
